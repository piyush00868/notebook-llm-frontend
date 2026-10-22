/**
 * Fetches a YouTube transcript from Cloudflare's network.
 *
 * Mindora's backend runs on Render, a datacentre address, and YouTube answers
 * datacentre addresses with "Sign in to confirm you're not a bot" before it will
 * release captions for anyone else's video. Vercel, also a datacentre range,
 * is refused identically. That refusal is about the network, not the request,
 * so the request has to originate somewhere else.
 *
 * Cloudflare is that somewhere else, and is worth trying before paying anyone:
 * it costs nothing to deploy, and its egress is not in the same category as a
 * cloud VM's. If this also gets the bot wall, the honest conclusion is that
 * transcripts have to be bought rather than hosted, and the backend route here
 * is where a paid transcript API would slot in.
 *
 * The official Data API cannot do this job at any price. `captions.download`
 * serves a video's captions to an authenticated caller only when that caller
 * owns the video or its uploader opted into third-party contributions, which
 * is the default -- so it answers 403 for effectively every public video.
 */

const INNERTUBE_URL =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

/** YouTube video ids are exactly this shape; anything else is not a video. */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** A ceiling on what comes back, so one request cannot return an unbounded body. */
const MAX_TRANSCRIPT_CHARS = 500_000;

interface InnerTubeClient {
  name: string;
  /** The numeric client id, which the `X-YouTube-Client-Name` header requires. */
  id: string;
  version: string;
  userAgent: string;
  extra: Record<string, unknown>;
}

/**
 * Clients to try, in order.
 *
 * They are not interchangeable: YouTube decides per client how much trust a
 * request has earned, and a refusal to one says nothing about the next. The
 * mobile clients serve captions without the proof-of-origin token that desktop
 * and embedded contexts now require -- verified against a public video, where
 * desktop and embedded contexts returned no tracks at all.
 */
const INNER_TUBE_CLIENTS: InnerTubeClient[] = [
  {
    name: "ANDROID",
    id: "3",
    version: "20.10.38",
    userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
    extra: { androidSdkVersion: 34 },
  },
  {
    name: "IOS",
    id: "5",
    version: "20.10.4",
    userAgent:
      "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3 like Mac OS X)",
    extra: { deviceModel: "iPhone16,2" },
  },
];

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

interface Env {
  YOUTUBE_PROXY_SECRET?: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, x-proxy-key",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    );
}

/**
 * Flattens a `timedtext` XML document into readable prose.
 *
 * Timings and styling are dropped. Each cue holds one `<s>` per spoken word, so
 * words are concatenated in order; cues holding only whitespace -- the
 * paragraph breaks YouTube interleaves -- contribute nothing.
 */
function parseTimedTextXml(xml: string): string {
  const cues: string[] = [];
  const cuePattern = /<(?:p|text)\b[^>]*>([\s\S]*?)<\/(?:p|text)>/g;
  let cue: RegExpExecArray | null;

  while ((cue = cuePattern.exec(xml)) !== null) {
    const inner = cue[1] ?? "";
    let text = "";
    const wordPattern = /<s\b[^>]*>([^<]*)<\/s>/g;
    let word: RegExpExecArray | null;

    while ((word = wordPattern.exec(inner)) !== null) {
      text += word[1] ?? "";
    }

    if (!text) {
      text = inner.replace(/<[^>]+>/g, "");
    }

    text = decodeEntities(text).trim();

    if (text) {
      cues.push(text);
    }
  }

  return cues.join(" ").slice(0, MAX_TRANSCRIPT_CHARS);
}

async function fetchTranscript(
  videoId: string,
): Promise<
  | { content: string; via: string }
  | { error: string; status: number }
> {
  const notes: string[] = [];
  let declined = false;

  for (const client of INNER_TUBE_CLIENTS) {
    const response = await fetch(INNERTUBE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "X-YouTube-Client-Name": client.id,
        "X-YouTube-Client-Version": client.version,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAI",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: client.name,
            clientVersion: client.version,
            hl: "en",
            gl: "US",
            ...client.extra,
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    });

    if (!response.ok) {
      notes.push(`${client.name} HTTP ${response.status}`);
      continue;
    }

    const data = (await response.json()) as {
      playabilityStatus?: { status?: string; reason?: string };
      captions?: {
        playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
      };
    };

    const playability = data.playabilityStatus?.status;
    const reason = data.playabilityStatus?.reason ?? "";
    const tracks =
      data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

    notes.push(
      `${client.name} ${playability ?? "unknown"}` +
        `${reason ? ` (${reason})` : ""} ${tracks.length} track(s)`,
    );

    if (/unavailable|private|been removed|does not exist/i.test(reason)) {
      return { error: `This video is unavailable. (${reason})`, status: 404 };
    }

    if (playability === "LOGIN_REQUIRED" || playability === "UNPLAYABLE") {
      declined = true;
      continue;
    }

    if (tracks.length === 0) {
      continue;
    }

    // Prefer a human-written track over an auto-generated one.
    const track = tracks.find((entry) => entry.kind !== "asr") ?? tracks[0];

    if (!track) {
      continue;
    }

    // The track URL is signature-bound to whoever asked for it, so it can only
    // be fetched from here rather than cached and replayed elsewhere.
    const trackResponse = await fetch(track.baseUrl, {
      headers: {
        "User-Agent": client.userAgent,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAI",
      },
    });

    if (!trackResponse.ok) {
      notes.push(`${client.name} track HTTP ${trackResponse.status}`);
      continue;
    }

    const content = parseTimedTextXml(await trackResponse.text());

    if (content.trim()) {
      return { content, via: `innertube:${client.name.toLowerCase()}` };
    }

    notes.push(`${client.name} track parsed to nothing`);
  }

  const detail = notes.join(" | ");

  if (declined) {
    return {
      error: `YouTube would not serve a transcript from this network. ${detail}`,
      status: 429,
    };
  }

  return { error: `No captions could be read. ${detail}`, status: 400 };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      /*
       * The preflight needs the same headers as a real response. Answering 204
       * with none of them fails the request in a browser while looking
       * perfectly fine to a server-side client, which is exactly the kind of
       * difference that only shows up in production.
       */
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "content-type, x-proxy-key",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405);
    }

    // Optional, so deploying needs no extra setup. Set it with
    // `wrangler secret put YOUTUBE_PROXY_SECRET`.
    const expected = env.YOUTUBE_PROXY_SECRET;

    if (expected && request.headers.get("x-proxy-key") !== expected) {
      return json({ error: "Not authorised." }, 401);
    }

    let videoId: unknown;

    try {
      const body = (await request.json()) as { videoId?: unknown };
      videoId = body.videoId;
    } catch {
      return json({ error: "Body must be JSON." }, 400);
    }

    if (typeof videoId !== "string" || !VIDEO_ID_PATTERN.test(videoId)) {
      return json({ error: "A YouTube video id is required." }, 400);
    }

    try {
      const result = await fetchTranscript(videoId);

      if ("error" in result) {
        return json({ error: result.error }, result.status);
      }

      return json(
        {
          videoId,
          content: result.content,
          via: result.via,
          chars: result.content.length,
        },
        200,
      );
    } catch (error) {
      console.error("YOUTUBE WORKER ERROR:", error);

      return json({ error: "Transcript fetch failed." }, 500);
    }
  },
};
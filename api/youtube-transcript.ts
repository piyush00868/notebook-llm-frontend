import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Fetches a YouTube transcript off-origin.
 *
 * Mindora's backend is on a datacentre address, and YouTube answers datacentre
 * addresses with "Sign in to confirm you're not a bot" before it will hand over
 * captions for anyone else's video. That refusal is about the address, so the
 * request has to originate somewhere else. This function is that somewhere
 * else: it runs on Vercel, fetches the transcript, and returns the plain text.
 *
 * The official Data API cannot be used for this. `captions.download` serves a
 * video's captions to an authenticated caller only when that caller owns the
 * video or the uploader opted into third-party contributions, which is the
 * default -- so it answers 403 for effectively every public video, and no
 * amount of consent changes that.
 *
 * Set YOUTUBE_PROXY_SECRET to require a matching `x-proxy-key` header. It is
 * optional so the backend works without extra configuration, but the endpoint
 * is public and unthrottled, so setting it is worth doing.
 */

const INNER_TUBE_URL =
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
 * and embedded contexts now require.
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

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function isAuthorised(req: IncomingMessage): boolean {
  const expected = process.env.YOUTUBE_PROXY_SECRET;

  // No secret configured means the endpoint is open, which is the default so
  // that deployment needs no extra setup.
  if (!expected) {
    return true;
  }

  const provided = req.headers["x-proxy-key"];

  return (
    typeof provided === "string" && provided === expected
  );
}

async function fetchTranscript(
  videoId: string,
): Promise<{ content: string; via: string } | { error: string; status: number }> {
  const notes: string[] = [];
  let declined = false;

  for (const client of INNER_TUBE_CLIENTS) {
    const response = await fetch(INNER_TUBE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "X-YouTube-Client-Name": client.id,
        "X-YouTube-Client-Version": client.version,
        "Accept-Language": "en-US,en;q=0.9",
        // Recorded consent. Without it YouTube answers some callers with an
        // interstitial before the request is even considered.
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
    // be fetched from here rather than being cached and replayed elsewhere.
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

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-proxy-key");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Use POST." }));
    return;
  }

  if (!isAuthorised(req)) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not authorised." }));
    return;
  }

  let videoId: unknown;

  try {
    const raw = await readBody(req);
    videoId = raw ? (JSON.parse(raw) as { videoId?: unknown }).videoId : undefined;
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Body must be JSON." }));
    return;
  }

  if (typeof videoId !== "string" || !VIDEO_ID_PATTERN.test(videoId)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "A YouTube video id is required." }));
    return;
  }

  try {
    const result = await fetchTranscript(videoId);

    res.setHeader("Content-Type", "application/json");

    if ("error" in result) {
      res.statusCode = result.status;
      res.end(JSON.stringify({ error: result.error }));
      return;
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        videoId,
        content: result.content,
        via: result.via,
        chars: result.content.length,
      }),
    );
  } catch (error) {
    console.error("YOUTUBE PROXY ERROR:", error);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Transcript fetch failed." }));
  }
}
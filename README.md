# Mindora — Frontend

The web client for **Mindora**, an AI knowledge workspace. You collect sources — PDFs, web pages, YouTube transcripts, pasted text — into a notebook, then ask questions that are answered strictly from those sources with inline, clickable citations.

This is a Vite + React 19 + TypeScript SPA. It talks to the Express backend in [`../backend`](../backend); it has no build-time dependency on it, only a URL.

---

## Stack

| | |
|---|---|
| Framework | React 19, TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`) |
| Routing | react-router-dom 7 |
| Auth | Clerk (`@clerk/clerk-react`) |
| Components | Base UI (`@base-ui/react`) + shadcn-style wrappers |
| Animation | Motion (`motion/react`) |
| Forms | react-hook-form + Zod |
| Icons | lucide-react |
| Toasts | sonner |

---

## Quick start

### Prerequisites

- Node.js 20+ (developed on 25.x)
- A Clerk application
- The backend running locally on port `4000`

### 1. Install

```bash
npm install
```

### 2. Configure the environment

Create a `.env` file in this directory:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:4000
```

### 3. Run

```bash
npm run dev
```

Vite serves on **http://localhost:5173** by default. No proxy is configured — the browser calls the backend directly, so CORS is entirely the backend's concern.

---

## Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite` | Dev server with HMR |
| `npm run build` | `tsc -b && vite build` | Type-check, then build to `dist/` |
| `npm run lint` | `eslint .` | Lint (also type-aware rules are **not** enabled) |
| `npm run preview` | `vite preview` | Serve the production build locally |

There is **no test script and no test runner**. Verification has been manual and browser-driven.

---

## Environment variables

Only two variables are read, both in `src/main.tsx` and `src/lib/api.ts`.

| Variable | Required | Default | Used by |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | **Yes** | none | `main.tsx` — throws if absent |
| `VITE_API_URL` | No | `http://localhost:4000` | `api.ts` — trailing slashes stripped |

Anything prefixed `VITE_` is **inlined into the bundle at build time**. Changing `VITE_API_URL` requires a rebuild, not just a restart.

### Browser storage

The app also persists preferences in `localStorage`:

| Key | Purpose |
|---|---|
| `mindora:theme` | `light` \| `dark` \| `system` |
| `mindora:workspace-id` | active workspace |
| `mindora:active-chat:<notebookId>` | active conversation per notebook |
| `mindora:sources-panel` | sidebar open/collapsed (whole sidebar) |
| `mindora:sources-expanded` | sources disclosure inside the sidebar |
| `mindora:chat-labels` | cached chat titles (see Gotchas) |

---

## Routes

All routes are declared in `src/App.tsx`; every page is `React.lazy()` code-split.

| Path | Page | Guard |
|---|---|---|
| `/` | `LandingPage` | public |
| `/sign-in/*` | `SignInPage` | `PublicOnlyRoute` — redirects signed-in users to `/workspace` |
| `/sign-up/*` | `SignUpPage` | `PublicOnlyRoute` |
| `/workspace` | `WorkspacePage` | `ProtectedRoute` |
| `/notebook/:id` | `NotebookPage` | `ProtectedRoute` |
| `*` | redirect → `/workspace` | — |

The trailing `*` on the auth routes is deliberate: Clerk's `routing="path"` renders multi-step flows such as `/sign-up/verify-email-code` in place, and exact matching broke sign-up.

Provider order: `ClerkProvider` (`main.tsx`) → `ThemeProvider` → `BrowserRouter` → `ErrorBoundary` → `TooltipProvider` → `Suspense` → routes.

---

## Project structure

```
src/
├── main.tsx              Clerk provider, env guard
├── App.tsx               routes, toaster, provider composition
├── index.css             Tailwind import, design tokens, prose styles
├── types/                domain types mirroring the backend
├── pages/                LandingPage, SignInPage, SignUpPage,
│                         WorkspacePage, NotebookPage
├── hooks/                one hook per data concern (see below)
├── lib/                  api client, citations, excerpts, chat history,
│                         formatting, theme context
└── components/
    ├── ui/               Base UI + shadcn-style primitives
    ├── layout/           shell, brand, theme toggle, error boundary
    ├── auth/             route guards, split auth layout
    ├── chat/             panel, composer, message rendering, citation sheet
    ├── sources/          panel, item, preview sheet, add-source dialog
    ├── notebook/         shell, sidebar, chat history, collapsed rail
    └── workspace/        chrome, switcher, notebook cards
```

### Hooks

| Hook | Responsibility |
|---|---|
| `useAsync` | generic keyed fetch primitive |
| `useWorkspace` | current user, active workspace, notebook CRUD |
| `useNotebook` | one notebook + its documents; polls while sources process |
| `useChats` | chat list, active chat, create/delete |
| `useChat` | messages for one chat, optimistic ask, abort, retry |
| `useNotebookCounts` | source counts for the workspace grid |
| `useSourcesPanel` | whole-sidebar open/collapsed (default **open**) |
| `useSourcesExpanded` | sources disclosure (default **collapsed**) |

There is no global state library. Each page fetches through these hooks.

---

## Design system

All tokens live in `src/index.css` and are prefixed `--nb-`. The prefix is deliberate — a self-referencing mapping like `--radius-lg: var(--radius-lg)` would collide with Tailwind's own `--radius-*` namespace and silently drop the value.

Tokens are declared in `:root`, overridden in `.dark`, then mapped into Tailwind via `@theme inline`.

**Dark mode is class-based**, not media-query: `@custom-variant dark (&:is(.dark *));`. The `dark` class is applied by an inline blocking script in `index.html` before first paint, which is what prevents the flash of light theme.

- **Light** — white canvas, neutral zinc greys.
- **Dark** — true AMOLED. `canvas #000000`, `sunken #0a0a0a`, `surface #111111`, `tinted #161616`, borders `#262626`, ink `#f5f5f5`.
- **Accent** is the only chromatic colour in the system (`#2563eb` light, `#3b82f6` dark).

Fonts load via CSS `@import` from Google Fonts: **Inter** (UI), **Instrument Serif** (display), **JetBrains Mono** (code).

`cn()` in `src/lib/utils.ts` is `twMerge(clsx(...))`. It's the only helper in the file.

`.prose-answer` is a hand-rolled long-form reading surface used to render assistant answers.

---

## Behaviour worth knowing

**Authentication.** Clerk owns the session; every API call carries `Authorization: Bearer <getToken()>`. Tokens are never stored client-side. Clerk's own header, footer and segmented control are hidden via `appearance` and replaced with local tab links.

**Theming.** `light | dark | system`, defaulting to `system`. One `ThemeProvider` owns the `dark` class at the app root — per-toggle providers previously fought each other. `useTheme()` throws outside a provider.

**Keyboard shortcuts** (defined only in `NotebookPage.tsx`):

| Shortcut | Action |
|---|---|
| `⌘B` / `Ctrl+B` | toggle the sources sidebar |
| `⌘⇧O` / `Ctrl+Shift+O` | new chat |
| `Enter` | send (in the composer) |
| `Shift+Enter` | newline (in the composer) |

Both global shortcuts are ignored when focus is in a text field or a `contentEditable`, and both are suppressed while an IME composition is active.

**Responsive.** `lg` (1024px) is the breakpoint of record for the notebook. Above it, a persistent 272px sidebar with an inner track so the collapse can animate. Below it, the same `SidebarContent` is reused inside a left `Sheet` — deliberately shared so desktop and mobile can't drift.

**Citations are resolved entirely client-side.** The answer payload carries only citation metadata, not passage text. Clicking a chip fetches the document, finds the matching chunk, and opens it in context.

**Optimistic chat.** A question is appended immediately with a placeholder assistant turn, then messages are silently re-fetched to reconcile client ids with database ids. `stop()` aborts the request and removes the placeholder pair.

---

## Backend endpoints used

The only network layer is `src/lib/api.ts`.

```
GET    /users/me
GET    /workspaces                          POST /workspaces
GET    /workspaces/:id                      DELETE /workspaces/:id
POST   /notebooks                           GET /notebooks/:id
DELETE /notebooks/:id
POST   /notebooks/:id/chats                 GET /notebooks/:id/chats
GET    /notebooks/chats/:chatId/messages    DELETE /notebooks/chats/:chatId
POST   /notebooks/chats/:chatId/ask
GET    /documents/:id                       DELETE /documents/:id
POST   /documents/upload                    (multipart PDF)
POST   /documents/url
POST   /documents/youtube
POST   /documents/text
```

> **Note:** `POST /notebooks/:id/ask` also exists on the backend but is deliberately **not** used. It runs RAG but writes no `Chat`/`ChatMessage` rows, so answers were lost on reload. The app uses the chat-scoped `/ask` route instead.

---

## Gotchas

Things that will trip up a new contributor. These are current and verified, not aspirational.

**`strict` is not enabled.** `tsconfig.app.json` omits `"strict": true`, so app code is not strictly type-checked. Only `tsconfig.node.json` (which covers just `vite.config.ts`) sets it. Adding it will surface real errors.

**Tailwind does not generate `grid-rows-[0fr]` / `grid-rows-[1fr]`** in this build. `SourcesPanel` therefore sets `gridTemplateRows` and the transition **inline**. If you refactor that to utility classes, the sources collapse breaks silently — the list renders clipped to zero height.

**Chat labels are a client-side cache.** The backend `Chat` table has no title column, so the first question is cached in `localStorage` under `mindora:chat-labels`. A chat asked in a different browser, or before this existed, falls back to a date. Removing this requires a schema change on the backend.

**Two similarly named hooks with opposite defaults.** `useSourcesPanel` controls the whole sidebar and defaults **open**; `useSourcesExpanded` controls the disclosure inside it and defaults **collapsed**. Easy to mix up.

**No dev-server proxy.** Cross-origin requests go straight to `VITE_API_URL`.

**Dependencies present but unused.** `react-markdown` and `remark-gfm` are installed, but `AssistantMessage.tsx` uses a hand-rolled markdown parser instead. Seven of the seventeen `src/components/ui` primitives are also unused (`avatar`, `badge`, `card`, `popover`, `scroll-area`, `select`, `tabs`). There is assorted dead code too — `WorkspaceHeader`, `AssistantAvatar`, `UserAvatar`, `Turn`, `RelevanceNote`, `describeAddError`.

**Polling has no ceiling.** `useNotebook` polls every 6s while any source is `PENDING`/`PROCESSING`, indefinitely. A stuck source polls forever.

**`useNotebookCounts` is an N+1.** Because the workspace payload omits documents, the grid fetches each notebook individually with a concurrency-4 pool. Fine at current scale, not at hundreds of notebooks.

---

## Deploying

Before shipping, both of these are hard requirements:

1. **Use a production Clerk key** (`pk_live_…`). Development keys are restricted to localhost origins and will fail on a real domain.
2. **Set `VITE_API_URL` to your deployed backend** before building. It is inlined at build time, so a stale value points every visitor's browser at `localhost:4000`.

The backend must also allow your deployed frontend origin via CORS.

`.gitignore` covers `node_modules`, `.env` and `dist` — keep it that way; the `.env` holds your Clerk key.
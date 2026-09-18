# Barcelona Cultural Calendar (Next.js)

> **Picking this up fresh (e.g. in Claude Code)?** Read `CONTEXT.md` first —
> it covers what this app is for, the category/genre preferences the data
> was researched against, the data schema, and known rough edges. This file
> covers setup, running, testing, and deployment.

The weekly calendar grid, rebuilt as a proper Next.js (App Router + TypeScript)
app: a small typed data layer, React Server Components for the initial render,
and a chat box that talks to Claude (via your own Anthropic API key) to add,
edit, or delete events, using tool calling and — when it needs to look
something up — the Claude API's built-in web search tool.

## 1. Get an API key

Create one at https://console.anthropic.com/settings/keys. This is billed to
your own Anthropic API console account, separate from any claude.ai
subscription — see the "Cost" section below for what to expect.

## 2. Set up

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste your key in place of sk-ant-...
npm run dev
```

Open http://localhost:3000. Try asking the chat box in the corner something
like "add a free jazz night at Marula Café on Sep 9" or "delete the Bresh Club
event on Sep 2".

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Run a production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) for the pure date/grid logic |

## How it's wired together

```
data/events.json, data/meta.json     →  the one source of truth for events
                                          and category/genre/week config

src/lib/types.ts                     →  the domain model (CalendarEvent,
                                          CategoryKey, GenreKey, ...) — every
                                          other module is built on these types
src/lib/dates.ts, src/lib/grid.ts     →  pure functions: date math and the
                                          "which events go where in this
                                          week's grid" layout algorithm
                                          (unit tested — see src/lib/__tests__)
src/lib/store.ts                     →  the only place that touches the
                                          filesystem (server-only)
src/lib/tools.ts                     →  the add_event/edit_event/delete_event
                                          tool definitions Claude can call,
                                          plus the code that executes them
src/lib/chat.ts                      →  the tool-use agent loop: call Claude,
                                          run whatever tools it asks for,
                                          feed results back, repeat

src/app/page.tsx                     →  Server Component: reads events/meta
                                          straight from disk, no network hop
src/app/api/events/route.ts          →  GET  — serves the current events/meta
src/app/api/chat/route.ts            →  POST — runs a chat message through
                                          the agent loop and returns the reply
                                          plus any updated events

src/components/CalendarApp.tsx        →  client component: owns filter state
                                          and the current event list
src/components/WeekSection.tsx        →  renders one week's grid + detail
                                          table from src/lib/grid.ts's output
src/components/FilterBar.tsx          →  category/genre filter chips
src/components/ChatPanel.tsx           →  the floating chat box
```

## Cost

Each add/edit/delete message costs a fraction of a cent (roughly
$0.005–$0.01 with `claude-sonnet-5`, the model this app uses) — mostly input
tokens for the small system prompt and tool definitions. A message where
Claude uses `web_search` to look something up first adds a flat $0.01 per
search plus a bit more in tokens for the results, so more like $0.015–$0.02.
At a couple of edits a few times a week this comes out to well under $1/month.
Billed to your own Anthropic API console account/credits, separate from any
claude.ai subscription.

## Deploying it somewhere permanent

The important constraint: **the event data lives in two plain JSON files on
disk** (`data/events.json`, `data/meta.json`), and your API key must stay
server-side — it's only ever read inside `src/lib/anthropic-client.ts`
(a server-only module) and the API routes, never shipped to the browser.

- **Simplest — a host with a persistent, writable filesystem** (Render,
  Railway, Fly.io, a plain VPS running `npm run build && npm start`): edits
  made through the chat box persist exactly like they do locally.
- **Vercel (or other serverless-function hosts):** these do **not** keep a
  writable persistent disk between invocations, so `data/events.json` would
  reset on every deploy and edits could vanish between requests. If you
  deploy there anyway, swap the handful of functions in `src/lib/store.ts`
  (`readEvents`/`writeEvents`) for reads/writes to something persistent —
  Vercel KV/Blob, Postgres (Neon, Supabase), etc. Nothing else in the app
  needs to change, since every other module only ever talks to `store.ts`.
- Either way, set `ANTHROPIC_API_KEY` as an environment variable in the
  host's dashboard rather than committing `.env.local`.

## Extending the chat box later

It currently has four tools: `add_event`, `edit_event`, `delete_event`
(defined and executed in `src/lib/tools.ts`), and `web_search` (a server-side
tool the Anthropic API resolves on its own — see the comment in
`src/lib/chat.ts` for how the agent loop distinguishes the two kinds). To add
a new ability, add an entry to `CALENDAR_TOOLS` in `src/lib/tools.ts` and a
matching `case` in `executeTool()`.

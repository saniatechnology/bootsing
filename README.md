# Barcelona Cultural Calendar — standalone app

> **Picking this up fresh (e.g. in Claude Code)?** Read `CONTEXT.md` first —
> it covers what this app is for, the category/genre preferences the data
> was researched against, the data schema, and known rough edges. This file
> covers setup, running, and deployment.

The same weekly calendar grid you had as an artifact, now a real app with:

- a small Express backend that serves the event data from `data/events.json`
- a chat box in the bottom-right corner that talks to Claude (via your own
  Anthropic API key) to add, edit, or delete events, using tool calling —
  changes are written straight back to `data/events.json`

## 1. Get an API key

Create one at https://console.anthropic.com/settings/keys. This is a
pay-as-you-go key billed to your own Anthropic account (separate from your
claude.ai subscription) — the chat box calls the Claude API directly, and
each message costs a small fraction of a cent to a few cents depending on
length.

## 2. Set up

```bash
cd local-events-finder
npm install
cp .env.example .env
# edit .env and paste your key in place of sk-ant-...
npm start
```

Open http://localhost:3000. The calendar loads from `data/events.json`; the
chat box in the corner can edit that file live — try "Add a free jazz concert
at Marula Café on Sep 9, cost free" or "Delete the Bresh Club event on Sep 2".

## How it's wired together

```
public/index.html, app.js, style.css   →  the calendar UI (same design as before,
                                            now rendered client-side from JSON
                                            instead of baked into static HTML)
data/events.json                        →  the one source of truth for events
server.js                               →  GET /api/events   → returns the JSON
                                            POST /api/chat    → runs your message
                                            through Claude with add_event /
                                            edit_event / delete_event tools,
                                            executes whatever it calls, saves
                                            the file, returns the new data
```

The Python script (`../build_calendar.py`) and `export_data.py` are no longer
needed to regenerate the site — they were only used once, to turn the
original event list into `data/events.json`. From here on, edit events
through the chat box (or by hand-editing `data/events.json`).

## Deploying it somewhere permanent

The important constraint: **the event data lives in a plain JSON file on
disk**, and your API key must stay server-side (never shipped to the
browser — this app already keeps it in `.env`, never in `public/`).

## Cost

Each add/edit/delete message costs a fraction of a cent (roughly
$0.005–$0.01 with `claude-sonnet-5`, the model this app uses) — mostly input
tokens for the small system prompt and tool definitions. A message where
Claude uses `web_search` to look something up first adds a flat $0.01 per
search plus a bit more in tokens for the results, so more like $0.015–$0.02.
At a couple of edits a few times a week this comes out to well under $1/month.
This is billed to your own Anthropic API console account/credits
(console.anthropic.com) — a separate balance from any claude.ai subscription.

- **Simplest — a small always-on server (Render, Railway, Fly.io, a cheap
  VPS):** these keep a persistent disk, so `npm start` there works exactly
  like it does locally, and edits made through the chat box stick around.
  This is the recommended path for a personal tool like this one.
- **Vercel / Netlify style serverless functions:** these do *not* keep a
  writable persistent disk between requests, so `data/events.json` would
  reset on every deploy and edits could vanish between invocations. If you
  want to deploy there anyway, swap the two functions in `server.js`
  (`readEvents`/`writeEvents`) for reads/writes to something persistent —
  Vercel KV/Blob, Postgres (e.g. Neon or Supabase's free tier), or similar —
  everything else in the app stays the same.
- Either way, set `ANTHROPIC_API_KEY` as an environment variable in the
  host's dashboard rather than committing `.env`.

## Extending the chat box later

Right now it only has three tools: `add_event`, `edit_event`, `delete_event`.
If you want it to also answer questions ("what's on this weekend?") without
editing anything, that already works today — just ask, and Claude will reply
in text without calling a tool. To add new abilities (e.g. a `search_events`
tool, or letting it fetch info from a URL you paste in), add a new entry to
the `TOOLS` array and a matching case in `executeTool()` in `server.js`.

# Project brief — Barcelona Cultural Calendar

Read this first if you're picking up this project cold (e.g. in Claude Code /
VS Code). It's the "why" behind the app; `README.md` is the "how" (setup,
running, testing, deploying, cost).

## What this is

A personal, single-user web app for Sania (a web developer based in
Barcelona) that tracks cultural events happening in Barcelona over a rolling
~30-day window. It renders as a weekly, spreadsheet-style grid — day columns,
each event a horizontal bar sized to how long it runs, shorter one-off events
floating to the top of each week and longer exhibitions/programs sitting
lower and stretching across the days they're open. Numbers on each bar match
a detail row below with the full description and a "more info" link.

The point of the app is **discovery of independent/emerging events**, not a
tourist-listing site — see the category list and bias below. This version is
built as a Next.js (App Router + TypeScript) app — a rewrite of an earlier
plain-Express version, with the same functionality but a typed data model,
unit-tested layout logic, and React components instead of hand-built HTML
strings.

## What counts as "interesting" (the original brief)

The event data was originally researched against 11 categories, in this
priority order of what Sania actually wants to see:

1. **Independent / artist-run spaces**
2. **Contemporary art & galleries** — including openings and closings (a
   closing show gets the "closing"/last-chance flag)
3. **Queer events**
4. **Music — pop / electronic, small-scale** — discovery-oriented club nights
   and small-room shows, not big-room mainstream acts
5. **Music production** — meetups, workshops, gear/modular-synth culture
6. **Games / anime / nerd culture**
7. **Barcelona World Capital of Architecture 2026 program** — including the
   guided-tour ("Rutas") listings at barcelona.cat/capitalmundialarquitectura
8. **Fashion**
9. **Tech & software**
10. **Neighborhood festivals** — festes majors, La Mercè, etc.
11. **"Chic but interesting" standout events** — polished/dressed-up picks
    that are still a genuine choice, not just tourist spectacle (e.g. Cirque
    du Soleil counted here, not as a default "big show" pick)

**General bias across all categories: favor independent, emerging, and
discovery-oriented events over mainstream/tourist ones.** When two candidate
events are similar, the smaller/less-obvious one wins.

## Music/dance genre preferences (drives the genre filter)

Sania is specifically into **dancing** and wants the music category
filterable by genre:

- Primary interest, on by default: **Latin, Hip-Hop, Pop**
- Secondary interest: **Electronic/EDM** — wanted in the data, but **hidden
  by default in the UI**, with a toggle to reveal it ("show all" / individual
  chip click) — see `INITIALLY_HIDDEN_GENRES` in `src/components/CalendarApp.tsx`
- Genre tags are a best-effort read of each night's lineup/branding (matched
  by venue or event-name keyword — see `GENRE_RULES` in
  `research/build_calendar.py`), not an official classification. No dedicated
  hip-hop night turned up in the original research window; the tag exists
  and is ready as soon as one does.

## Current data window

The events currently in `data/events.json` cover **Aug 28 – Sep 27, 2026**
(5 weeks — see `data/meta.json`'s `"weeks"` array for exact boundaries).
This was a one-time deep research pass done in a Claude session: web search
plus browser automation (needed to get past `robots.txt` blocks and an
infinite-scroll listing on barcelona.cat to pull the full WCA2026 "Rutas"
guided-tour program).

**Going forward, the data does not refresh itself.** Two ways to extend the
window:

- Lightweight: the in-app chat box has a `web_search` tool, so asking it
  things like "find live music at Razzmatazz in the first week of October
  and add it" will do a real, current lookup before calling `add_event`.
- Thorough: for the kind of research that produced this dataset (browsing
  past robots.txt blocks, expanding paginated/lazy-loaded listings, cross-
  referencing multiple venues), go back to a Claude session capable of web
  browsing, ask for the next date window in the same 11-category brief above,
  and merge the results into `data/events.json` (same schema as below).

## Data schema

The canonical type is `CalendarEvent` in `src/lib/types.ts`. `data/events.json`
is an array of these:

```
{
  "id": 1,
  "name": "Nitsa: Fatima Hajji + NHYMPH",
  "venue": "Sala Apolo",
  "cat": "MUS",              // one of the CategoryKey values below
  "start": "2026-08-28",     // ISO date
  "end": "2026-08-28",       // ISO date (same as start for single-day events)
  "cost": "Paid",            // free text, e.g. "Free", "€15", "Free (registration)"
  "desc": "One or two sentence description.",
  "link": "https://...",     // "more info" URL
  "flags": [],               // any of "closing" | "rare" | "finale"
  "approx": false,           // true if the date is unconfirmed/approximate
  "genre": null              // only set for cat === "MUS": one of the GenreKey values, else null
}
```

`data/meta.json` (typed as `CalendarMeta`) holds category labels/colors,
genre labels, and week boundaries; regenerate it only if you change the
category or genre vocabulary itself (also update the `CATEGORY_KEYS` /
`GENRE_KEYS` unions in `src/lib/types.ts` to match — see
`research/build_calendar.py`'s `CATS` / `GENRE_LABELS` for where these
definitions originally came from).

### Category keys (`cat`)

| key | label |
|---|---|
| `IND` | Independent art spaces |
| `GAL` | Contemporary art & galleries |
| `QUEER` | Queer events |
| `MUS` | Music |
| `MUSPROD` | Music production |
| `GAME` | Games / anime / nerd culture |
| `ARCH` | World Capital of Architecture 2026 |
| `FASH` | Fashion |
| `TECH` | Tech & software |
| `NEIGH` | Neighborhood festivals |
| `CHIC` | Chic / standout |
| `BONUS` | Also on (bonus filler) |

### Genre keys (`genre`, `MUS` events only)

`latin`, `hiphop`, `pop`, `electronic` (hidden by default in the UI),
`mixed`, `other`.

## Architecture (see README.md for the fuller module-by-module map)

- `src/lib/` — all non-UI logic: the domain types, pure date/grid-layout
  math (unit tested in `src/lib/__tests__/`), the filesystem-backed data
  store, and the Claude tool-use agent loop.
- `src/app/` — Next.js App Router: `page.tsx` (Server Component, reads data
  straight off disk) and the two API routes (`/api/events`, `/api/chat`).
- `src/components/` — the client-side UI: filter chips, the week grid, and
  the chat panel, all rendering off the typed data model.
- `data/` — the only persistent state; two plain JSON files, fine for a
  single-user tool but won't survive on serverless hosts with no writable
  disk (see README's deploy section).
- `research/` — historical, not used by the running app: the original
  Python script that generated the first static HTML version
  (`build_calendar.py`, still a useful reference for the category/genre
  logic and the full list of sourced events with citations) and the original
  markdown deliverable.
- Cost: roughly $0.005–$0.02 per chat message, billed to your own Anthropic
  API console account/credits — see README's "Cost" section for the math.

## Known rough edges

- A handful of WCA2026 "Rutas" entries list venue as "Meets at Museo de
  Granollers" — extracted via a generic regex (in the original research
  pass) that occasionally grabbed a page's "related activities" section
  instead of the primary event; plausible given these are part of a
  Granollers-network tour program, but worth a glance if precision matters.
- The chat panel keeps the whole conversation history in a client-side ref
  (`historyRef` in `src/components/ChatPanel.tsx`) and resends it every
  message, so a long single-session chat costs progressively more per turn.
  Refreshing the page clears it; capping/summarizing it server-side (in
  `src/lib/chat.ts`) would be the fix if that becomes annoying.
- `data/events.json` has no locking — two simultaneous chat requests could
  race on the read-modify-write. Not a real risk for one person chatting one
  message at a time, but worth knowing if this ever becomes multi-user.

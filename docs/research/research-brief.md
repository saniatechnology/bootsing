# Research brief — local event population

Edit anything below, then tell me to run it. I (Copilot / Claude Opus 4.8) will research
using my own web tools (no Anthropic API, no web-search rate limits), assemble events that
match this brief, validate them, and insert them into the Supabase `events` table.

---

## 1. Scope (edit these)

- **Target week(s):** Current week and following three. (You may need to add the new weeks to the meta file.)
- **Mode:** `replace`  <!-- "replace" = delete events starting in each target week, then insert fresh | "append" = keep existing -->
- **Count per week:** `up to 50` — this is a **cap, not a target**. It exists only so research
  stops at a reasonable point; do NOT pad to reach it. Include fewer if fewer relevant events
  exist. Quality and relevance always beat quantity.
- **Favorite-venue events are separate from this cap.** Pull **all** available events from the
  favorite venues (section 2) regardless of the per-week count — they do not count against, and
  are not limited by, the 50 cap.
- **User scope:** insert under `DEFAULT_USER_ID` (from `.env.local`) — the app's single current user.

---

## 1b. Research log — read and update every round

A persistent findings log lives at **`research/research-log.md`**. It is written for agents who
do NOT have this session's context. Every research round MUST:

1. **Read it first.** Use it to avoid repeat work — it records which sources worked / failed /
   are blocked, which events were already retrieved (dedupe list), and which were checked and
   deliberately skipped as uninteresting (do not re-surface these).
2. **Update it after.** Add newly found/checked sources and their status, newly retrieved events,
   newly skipped events, out-of-window items noted for later, and open TODOs for the next round.

Keep the log concise and machine-scannable but human-readable. It is a data/working file, not
change documentation.

---

## 2. Configuration — what to look for (edit freely)

> Pulled from your live Supabase `preferences`. Edit here to change what I research;
> this file drives the research, it does NOT write back to your Configuration page.

**Intro / framing:**
These are the preferences events are gathered against — what I want to see, what to skip,
and the music I like for dancing.

### Event types I'm interested in

*In rough priority order — what I most want to discover first.*

1. Independent / artist-run spaces
2. Contemporary art & galleries — including openings and closings
3. Queer events
4. Music — pop / electronic, small-scale — discovery-oriented club nights and small-room
   shows, not big-room mainstream acts
5. Music production — meetups, workshops, gear / modular-synth culture
6. Games / anime / comics / nerd culture
7. Barcelona World Capital of Architecture 2026 — including the guided-tour ("Rutas") program
8. Fashion
9. Tech & software
10. Neighborhood festivals — festes majors, La Mercè, etc.
11. "Chic but interesting" standout events — polished picks that are still a genuine choice,
    not tourist spectacle

### Music styles I like for dancing

- Latin — *primary*
- Hip-Hop — *primary*
- Pop — *primary*
- Electronic / EDM — *secondary (wanted, lower priority)*

### Favorite venues, festivals & events

Get all events from these as far as they're available online, independent of the general number of desired events result:
- Apollo.
- Fluid.
- Razzmataz.
- Candy Darling.
- Santa Mónica.
- CCCB.
- Ssuave.
- La Bonne — https://labonne.org/activitats/ (all available events).

### Sources

Always check these on top of any other sources you might use.
- https://bcn.convoca.la/
- https://graf.cat/es/agenda/

### Online agendas for queer events

- Qlist Barcelona — check the dated event feed and load more results: https://qlist.app/cities/Spain/Barcelona/88
- Halo LGBT Barcelona — queer events across the city: https://www.halolgbt.com/es/barcelona


### What to skip

*General bias: favor independent, emerging, discovery-oriented events. When two options are
similar, the smaller / less-obvious one wins.*

- Tourist-oriented events
- Big-room mainstream music acts

---

## 3. Sourcing rules (edit if you want stricter/looser)

- Only include **real events** found on a real source (venue site, ticketing page, listings
  site, official festival program). Every event gets a `link` to its most specific source.
- Prefer primary sources (venue / official program) over aggregators.
- **Dig past incomplete previews.** Many venue sites render their agenda with JavaScript,
  so a plain page fetch only returns the first few server-rendered days. If a source looks
  truncated or incomplete, do not stop there — do what it takes to get the full listing:
  - Open the page in the **browser tool** (which runs the site's JavaScript like a real
    browser) and **scroll** and/or **click** through the calendar, date cells, "load more",
    pagination, or filter controls until all events for the target week are loaded.
  - If the venue's own site still won't surface the full week, find the venue's events on
    another Barcelona listings site that carries them (e.g. ticketing pages, graf.cat,
    bcn.convoca.la, or similar aggregators) and source the events from there instead.
  - Only conclude a venue has no events in the week after you've actually confirmed the full
    week is loaded — never because the first partial view happened to be empty.
- **Open each event's own detail page for the full data.** Agenda / listing / calendar views
  usually show only a title and maybe a room — the **start time, door time, price, and full
  description often live only on the individual event page**. Click through to each event's
  detail page (or fetch its URL) to collect these before saving; don't leave `start_time` or
  `cost` empty just because the listing view omitted them.
  - Prices are frequently under labels like "Advance" / "Box office" / "Door"; capture the
    advance price and note the door price when both exist (e.g. `"€19 (€22 door)"`).
  - For late-night club nights that only list a "Doors open at" time, use that as the start
    time. If a detail page genuinely publishes no time or price, only then fall back to
    leaving it blank / `cost: "Unknown"`.
- If a date is uncertain, set `approx: true` rather than dropping the event.
- If price is unconfirmed, use `cost: "Unknown"` (or "Free" only when clearly free).
- Only include events whose **start date falls within the target week**.
- Keep descriptions short (one or two sentences), factual, in English.

---

## 4. Event shape & vocabulary (reference — don't need to edit)

Each event must fit `NewEventInput`:


| Field    | Required | Notes                                          |
| -------- | -------- | ---------------------------------------------- |
| `name`   | yes      | event title                                    |
| `venue`  | yes      | place / venue name                             |
| `cat`    | yes      | one category key (below)                       |
| `start`  | yes      | ISO`yyyy-mm-dd`, inside target week            |
| `end`    | yes      | ISO`yyyy-mm-dd` (same as start for single-day) |
| `cost`   | yes      | free text, e.g. "Free", "€12", "Unknown"      |
| `desc`   | yes      | short description                              |
| `link`   | yes      | source URL                                     |
| `approx` | no       | `true` if date uncertain (default `false`)     |
| `genre`  | no       | only meaningful when`cat: "MUS"`               |

**Category keys** → label:

- `IND` Independent art spaces
- `GAL` Contemporary art & galleries
- `QUEER` Queer events
- `MUS` Music
- `MUSPROD` Music production
- `GAME` Games / anime / nerd culture
- `ARCH` World Capital of Architecture 2026
- `FASH` Fashion
- `TECH` Tech & software
- `NEIGH` Neighborhood festivals
- `CHIC` Chic / standout
- `BONUS` Also on (bonus filler)

**Genre keys** (only for `cat: "MUS"`):
`latin`, `hiphop`, `pop`, `electronic`, `mixed`, `other`

---

## 5. What happens when you say "go"

1. I read `research/research-log.md` (section 1b) to skip already-done / blocked / skipped work.
2. I research the target week(s) per this brief using `fetch_webpage`, respecting the per-week
   cap (up to 50, not a target) and pulling **all** favorite-venue events on top of that.
3. I assemble a validated `NewEventInput[]` and show it to you for a quick look.
4. I update `research/research-log.md` with new sources, retrieved/skipped events, and TODOs.
5. I run a throwaway script that (optionally deletes events starting in each week, then)
   inserts them into Supabase with the correct column mapping.
6. I re-query and report counts + titles; you reload the running dev app to see them.

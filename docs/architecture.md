# Architecture

How Bootsing is put together, for anyone changing or extending it. The
[README](../README.md) covers setup, running and personalising.

## Overview

Bootsing is a Next.js 16 App Router application (TypeScript, React 19) with a
Supabase Postgres database and the Anthropic SDK for the two AI features. It is
single-user: every query is scoped to `DEFAULT_USER_ID` using the Supabase
service-role key, and there is no authentication in front of the app (see
[Known rough edges](#known-rough-edges)).

Three pages:

| Route            | What it shows                                                                                           | Client component      |
| ---------------- | ------------------------------------------------------------------------------------------------------- | --------------------- |
| `/explore`       | Every event, one week at a time, in a day-column grid. Manual editing, chat proposals, research a week. | `CalendarApp`         |
| `/`              | The events you saved (status Boots / Maybe / Interesting) in an hourly week view plus a list.           | `HomeApp`             |
| `/configuration` | Free-text preference sections that the research prompt is built from.                                   | `ConfigurationEditor` |

Pages are Server Components that read from the database on every request
(`force-dynamic`) and hand the data to a client component that owns UI state
and calls the API routes for changes.

## Module map

```
src/
  app/
    page.tsx, explore/page.tsx        server: load data via lib/page-data, render Home/Explore
    configuration/page.tsx
    api/**/route.ts                   thin handlers built on lib/http
    globals.css                       @imports src/styles/*.css in order

  lib/                                framework-free logic (pure) or server-only modules
    types.ts        persisted domain model: CalendarEvent, CalendarMeta, the key unions
    validation.ts   zod schemas for everything crossing a trust boundary + inferred input types
                    + toolInputSchema() (JSON Schema for Claude tool definitions)
    api-types.ts    response shapes shared by routes and the browser client
    dates.ts        UTC-midnight date helpers and formatting
    weeks.ts        week arithmetic (configured + synthetic future weeks, research guard)
    grid.ts         week-grid lane layout          hourly.ts   hourly-view layout
    events.ts       materializeNewEvent, summarizeEvent, isSafeHttpUrl
    event-meta.ts   group/colour/filter lookups     status-meta.ts  labels + emoji per status
    selection.ts    immutable Set helpers           keyboard.ts     Enter/Space activation
    progress.ts     NDJSON progress protocol (server emitter + browser reader)
    api.ts          browser client for the API routes (throws ApiError)

    -- server-only --
    env.ts          requireEnv                      supabase.ts   lazy service-role client
    store.ts        the only module that talks to the database
    http.ts         HttpError, parseJsonBody, apiRoute, jsonResponse
    page-data.ts    loadCalendarPage for the two calendar pages
    anthropic-client.ts   lazy SDK client, MODEL, prompt caching, streamTurn, webSearchTool
    tools.ts        Claude tool definitions for chat + the read-only find_events executor
    proposals.ts    turns mutating tool calls into ProposedActions (pure)
    chat.ts         the chat agent loop            apply.ts   applies approved proposals
    research.ts     the research agent loop        system-prompt.ts / research-prompt.ts / taxonomy-prompt.ts

  hooks/            useSelection, useWeekNavigation, useConnectionStatus, useResearch, useOffline
  components/
    shared/         Modal, TopBar, WeekNav, EventList, EventDetail, EventForm, ProgressList, ...
    calendar/       Explore: CalendarApp, WeekSection, FilterBar, BulkActionsBar, Research*
    home/           Home: HomeApp, HourlyWeekSection, StatusFilter, StatusControls, HomeBulkBar
    chat/           ChatPanel, ProposalReview
    ConfigurationEditor.tsx
  styles/           one CSS file per area; theme.css holds every colour token

supabase/
  migrations/       schema (events, categories, weeks, app_settings, preferences; RLS ready)
  seed/             starter dataset for `npm run seed`
scripts/seed.mjs
```

Import direction, top to bottom: pure `lib` modules import nothing but each
other; server-only modules import pure ones; routes import server modules;
hooks and components import pure modules and `lib/api.ts`. `store.ts` is the
only place that knows about tables and columns, and `validation.ts` is the only
place an event's fields are declared.

## Request flows

**Page load.** `loadCalendarPage` reads events and meta, picks the week
(`?w=` or the week containing today) and renders. Errors render
`LoadErrorScreen`.

**Manual edit.** A component calls `api.updateEvent` (or create/delete). The
route validates with `eventPatchSchema`, `store.ts` writes, and the response
carries the full, current event list, which the component swaps into state.
Bulk actions send one request per event.

**Chat.** `POST /api/chat` streams NDJSON progress while `runChatTurn` runs
the agent loop: Claude may call `find_events` (executed inline) and
`web_search` (executed by the Anthropic API). Any `add_event` / `edit_event` /
`delete_event` call is **not** executed; `proposals.ts` validates it with the
same zod schemas the API uses and returns it as a `ProposedAction`. The user
ticks the ones to keep and `POST /api/chat/apply` re-validates and applies
them one by one, reporting per-action success.

**Research.** `POST /api/research` checks the week is one the calendar can
display (`isResearchableWeek`), then `researchAndReplaceWeek` asks Claude to
web-search events matching the saved preferences and submit them through the
`submit_week_events` tool. Submitted events are validated individually and
clamped to the week; events starting in that week are deleted and the new ones
inserted.

## The single source of truth for event shapes

`validation.ts` declares each event field once (`eventFields`) with a
description. From it are derived:

- the request schemas (`newEventInputSchema`, `eventPatchSchema`,
  `proposedActionSchema`, ...),
- the TypeScript input types (`NewEventInput`, `EventPatch`, `ProposedAction`) via `z.infer`,
- the JSON Schema Claude receives for each tool, via `toolInputSchema()`
  (zod 4's `z.toJSONSchema`). A snapshot test in `validation.test.ts` shows
  exactly what the model is told.

Adding a field therefore means: a column migration, one line in
`EVENT_COLUMN_MAP` in `store.ts` (the `satisfies` clause makes forgetting it a
compile error), one line in `eventFields`, and the UI.

## Data model

`CalendarEvent` (see `types.ts`):

| Field                  | Notes                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| `id`                   | Assigned by the database.                                                   |
| `name`, `venue`        | Required.                                                                   |
| `cat`                  | One of `CATEGORY_KEYS`; categories map to filter groups via `catGroups`.    |
| `start`, `end`         | ISO dates, inclusive; equal for a single-day event.                         |
| `startTime`, `endTime` | Optional `HH:MM`; drives the Home hourly view only.                         |
| `cost`, `desc`, `link` | Free text; `link` must be an http(s) URL or empty.                          |
| `approx`               | Date unconfirmed.                                                           |
| `genre`                | Only for `cat === "MUS"`, otherwise `null`.                                 |
| `status`               | `null` (Explore only) or `boots` / `maybe` / `interesting` (saved to Home). |

Database columns differ where Postgres reserves the word (`starts`, `ends`,
`description`, `start_time`, `end_time`); the mapping lives in `store.ts`.
`CalendarMeta` (categories, groups, genre labels, week boundaries) is assembled
from the `categories`, `weeks` and `app_settings` tables.

## Known rough edges and follow-ups

- **No authentication.** Anyone who can reach a deployment can edit the data
  and spend the Anthropic credits behind `/api/chat` and `/api/research`. A
  shared-secret middleware is the smallest fix; real Supabase auth would use
  the RLS policies already in the migrations.
- Cancelling a research run in the UI aborts the browser request but not the
  server-side call, which still replaces the week's events when it finishes.
  Threading the request's `AbortSignal` into `streamTurn` would fix it.
- Bulk actions are N sequential requests; a bulk endpoint would be cheaper.
- The city ("Barcelona") is hardcoded in the two system prompts and the
  empty-week copy; it belongs in configuration.
- The chat history is kept in the browser and resent every turn, so a long
  conversation costs more per message. Capping or summarising it server-side
  is the fix if it becomes noticeable.
- Accessibility: event rows and day headers are `role="button"` elements that
  contain other interactive controls; dialogs have Escape/focus handling but no
  focus trap or scroll lock; single delete uses `window.confirm` while bulk
  delete uses a dialog.
- Some seeded WCA2026 "Rutas" venues came from a loose extraction and may name
  a related venue rather than the meeting point.

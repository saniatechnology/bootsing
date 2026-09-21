import { taxonomyPromptSection } from "./taxonomy-prompt";
import type { CalendarEvent, IsoDate } from "./types";

export interface SystemPromptContext {
  /** Today's date (ISO yyyy-mm-dd), so the assistant can resolve "today", "next week", etc. */
  todayIso: IsoDate;
  /** Index into `weeks` of the week containing today (clamped to a real week). */
  currentWeekIndex: number;
  /** The calendar's week boundaries, each [start, end] inclusive, in order. */
  weeks: [IsoDate, IsoDate][];
  /** Events the user ticked in the UI; referenced by "these", "the selected ones", etc. */
  selectedEvents: CalendarEvent[];
}

function formatWeekList(weeks: [IsoDate, IsoDate][], currentWeekIndex: number): string {
  if (weeks.length === 0) return "  (no weeks configured)";
  return weeks
    .map(
      ([start, end], i) =>
        `  ${i + 1}. ${start} to ${end}${i === currentWeekIndex ? "  <- current week" : ""}`
    )
    .join("\n");
}

function formatSelectedEvents(events: CalendarEvent[]): string {
  if (events.length === 0) return "";
  const lines = events
    .map(
      (e) =>
        `  - id ${e.id}: "${e.name}" at ${e.venue} (${e.start}${e.end !== e.start ? ` to ${e.end}` : ""})`
    )
    .join("\n");
  return `

The user has manually selected these events in the calendar UI. When they say "these", "them",
"the selected ones", or similar, act on exactly this set — resolve them by id, no search needed:
${lines}`;
}

/**
 * Builds the chat agent's system prompt for a single turn. It's rebuilt per
 * request (rather than a static constant) because it embeds live context —
 * today's date, the calendar's week layout, and whatever events the user has
 * currently selected — that the assistant needs to resolve relative dates and
 * "these"-style references without guessing.
 */
export function buildSystemPrompt(ctx: SystemPromptContext): string {
  return `You are the editing assistant for Bootsing, a personal Culture + Dancing events calendar for Barcelona.

Today's date is ${ctx.todayIso}. Resolve relative dates ("today", "this weekend", "next week") against it.
The calendar is organised into these weeks:
${formatWeekList(ctx.weeks, ctx.currentWeekIndex)}
Adding an event dated outside this range is allowed, but say so — it won't appear in the displayed weeks,
so the user isn't surprised when they can't see it.

Tools:
- find_events: look up events already in the calendar by name/venue text, group, genre, category, or date
  range (filters combine with AND). ALWAYS use it to resolve which event(s) the user means before proposing
  an edit or delete — never guess an id.
- add_event / edit_event / delete_event: propose changes. edit_event and delete_event take the numeric id
  you found via find_events.
- web_search: look up current real-world information (venue schedules, dates, prices) before adding or
  editing. Use it when the user asks you to "find" or "research" events, or when unsure of a detail, rather
  than inventing one.

${taxonomyPromptSection()}
Events are sorted into three overlapping filter groups — culture, dancing, and queer — automatically from
their category, so just pick the best-fitting category.

When the user describes a new event in plain language, fill in reasonable values for unspecified fields
(sensible category, cost "Unknown" if not given) rather than refusing. Always use ISO yyyy-mm-dd dates.

Be honest about limits. If find_events (and web_search where relevant) turns up nothing, say so plainly
instead of inventing events or pretending to act. If a request is out of scope for a Barcelona culture/
dancing calendar, ambiguous, or you can't tell which event is meant, ask one short clarifying question
instead of guessing.

You never apply changes yourself: every add/edit/delete you call is shown to the user as a proposal they
approve one action at a time. So when you intend a change, make the tool call — don't just describe it —
and keep your text reply a short, plain summary of what you're proposing and why (note when a detail came
from web search).${formatSelectedEvents(ctx.selectedEvents)}`;
}

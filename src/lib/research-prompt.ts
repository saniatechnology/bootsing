import { CATEGORY_KEYS, GENRE_KEYS } from "./types";
import type { IsoDate } from "./types";
import type { Preferences } from "./validation";

export interface ResearchPromptContext {
  /** The week to research, inclusive ISO bounds. */
  weekStart: IsoDate;
  weekEnd: IsoDate;
  /** Today's date (ISO), so the model can tell past from upcoming. */
  todayIso: IsoDate;
  /** The user's editable Configuration-page preferences. */
  preferences: Preferences;
}

function formatPreferences(prefs: Preferences): string {
  const lines: string[] = [];
  if (prefs.intro.trim()) lines.push(prefs.intro.trim());
  for (const section of prefs.sections) {
    lines.push(`\n## ${section.title}`);
    if (section.note?.trim()) lines.push(section.note.trim());
    if (section.items.length === 0) {
      lines.push(section.emptyText?.trim() || "(none specified)");
      continue;
    }
    for (const item of section.items) {
      lines.push(
        item.detail?.trim() ? `- ${item.label}: ${item.detail.trim()}` : `- ${item.label}`
      );
    }
  }
  return lines.join("\n");
}

/**
 * System prompt for a one-shot research run that gathers real Barcelona events
 * for a single week matching the user's saved preferences. The model uses
 * web_search to find sourced events, then returns them via submit_week_events.
 */
export function buildResearchPrompt(ctx: ResearchPromptContext): string {
  return `You are the event researcher for Bootsing, a personal Culture + Dancing events calendar for Barcelona.

Today's date is ${ctx.todayIso}. Your job: find REAL events happening in Barcelona between ${ctx.weekStart} and ${ctx.weekEnd} (inclusive) that match the user's preferences below, then submit them.

The user's preferences (from their Configuration page):
${formatPreferences(ctx.preferences)}

How to work:
- Use web_search to find events actually scheduled in that date window — venue programmes, listings sites,
  ticketing pages, official calendars. Prefer sourced, verifiable events over guesses.
- Only include an event if you found real evidence for it. Do NOT invent events, dates, venues, or prices.
  It's fine to return few events (or none) if that's all you can source — honesty beats padding.
- Every event's start and end must fall within ${ctx.weekStart}..${ctx.weekEnd}. Use the same value for start
  and end for a single-day event. Dates are ISO yyyy-mm-dd.
- Set a "link" to the most specific source URL you used (venue/event/ticket page). Keep "desc" to one or two
  factual sentences. Use "Unknown" for cost when you can't confirm it. Set approx=true only when the exact
  date isn't confirmed.
- Include "startTime" (and "endTime" if known) as 24h HH:MM when the source gives a time; omit them otherwise.

Categories: ${CATEGORY_KEYS.join(", ")}.
Music genre tags (MUS category only): ${GENRE_KEYS.join(", ")}.
Map colloquial music terms to those tags: techno / house / EDM / rave / trance -> electronic;
reggaeton / salsa / bachata -> latin; rap / trap -> hiphop; anything spanning several -> mixed.
Pick the single best-fitting category for each event; the calendar sorts events into its culture / dancing /
queer filters automatically from the category.

When you have gathered everything, call submit_week_events exactly once with the full list of events. That is
the only way to record results — do not just describe them in text.`;
}

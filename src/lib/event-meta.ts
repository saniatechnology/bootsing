/**
 * Helpers that read an event against the calendar's category metadata: which
 * filter groups it belongs to, the colour it should be drawn in, and whether
 * it passes the active group filter. Kept out of the components so the three
 * views (week grid, hourly grid, list) agree on the rules.
 */

import type { CalendarEvent, CalendarMeta, GroupKey } from "./types";

/** Colour used when an event's category maps to no group (should not happen with seeded meta). */
const UNGROUPED_COLOR = "var(--text-muted)";

/** The filter groups an event belongs to, in the order configured for its category. */
export function groupsOf(meta: CalendarMeta, event: CalendarEvent): GroupKey[] {
  return meta.catGroups[event.cat] ?? [];
}

/** The colour of the event's first (primary) group, used for bars, dots and borders. */
export function primaryGroupColor(meta: CalendarMeta, event: CalendarEvent): string {
  const primary = groupsOf(meta, event)[0];
  return primary ? meta.groupColors[primary] : UNGROUPED_COLOR;
}

/** Whether the event should be shown under the given group filter ("all" shows everything). */
export function matchesGroup(
  meta: CalendarMeta,
  event: CalendarEvent,
  group: GroupKey | "all"
): boolean {
  return group === "all" || groupsOf(meta, event).includes(group);
}

/** Human-readable list of the event's groups, e.g. "Culture · Queer". */
export function groupLabelsOf(meta: CalendarMeta, event: CalendarEvent): string {
  return groupsOf(meta, event)
    .map((g) => meta.groupLabels[g])
    .join(" · ");
}

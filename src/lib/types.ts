/**
 * Domain model for Bootsing — the Culture + Dancing Calendar.
 *
 * This module holds the persisted shapes only: what an event and the
 * calendar's configuration look like once stored. Shapes that cross a trust
 * boundary (request bodies, Claude tool inputs, change proposals) live in
 * `validation.ts` as zod schemas with their types inferred from them.
 *
 * The category and genre keys are a fixed, small vocabulary (see the README
 * for what each one means), so they're modeled as string literal unions rather
 * than plain `string` — this gives autocomplete and compile-time checking
 * everywhere an event is built or read, both in UI code and in the Claude tool
 * definitions.
 */

export const CATEGORY_KEYS = [
  "IND",
  "GAL",
  "QUEER",
  "MUS",
  "MUSPROD",
  "GAME",
  "ARCH",
  "FASH",
  "TECH",
  "NEIGH",
  "CHIC",
  "BONUS",
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const GENRE_KEYS = ["latin", "hiphop", "pop", "electronic", "mixed", "other"] as const;
export type GenreKey = (typeof GENRE_KEYS)[number];

/**
 * The user's personal triage of a saved event, shown on the Home page.
 * `null` means the event is not saved and lives only on the Explore page.
 * This is orthogonal to `cat`/`genre` (the shared taxonomy).
 */
export const EVENT_STATUS_KEYS = ["boots", "maybe", "interesting"] as const;
export type EventStatus = (typeof EVENT_STATUS_KEYS)[number];

/**
 * The three high-level groups shown as filters in the UI. A category can
 * belong to more than one group (see `CalendarMeta.catGroups`), so an event
 * can appear under multiple filters — e.g. a queer club night is both
 * "dancing" and "queer".
 */
export const GROUP_KEYS = ["culture", "dancing", "queer"] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

/** An ISO 8601 calendar date string, e.g. "2026-09-17". */
export type IsoDate = string;

export interface CalendarEvent {
  id: number;
  name: string;
  venue: string;
  cat: CategoryKey;
  start: IsoDate;
  end: IsoDate;
  /** Optional start/end clock time, 24h "HH:MM"; `null` when unknown. Display-only — the grid buckets by date. */
  startTime: string | null;
  endTime: string | null;
  cost: string;
  desc: string;
  link: string;
  approx: boolean;
  /** Only set when `cat === "MUS"`; `null` for every other category. */
  genre: GenreKey | null;
  /** The user's saved-event triage; `null` when the event isn't saved (Explore-only). */
  status: EventStatus | null;
}

export interface CategoryMeta {
  label: string;
  color: string;
}

export interface CalendarMeta {
  cats: Record<CategoryKey, CategoryMeta>;
  genreLabels: Record<GenreKey, string>;
  /** Which of the three filter groups each category belongs to; overlap is allowed. */
  catGroups: Record<CategoryKey, GroupKey[]>;
  groupLabels: Record<GroupKey, string>;
  /** Bar/dot color for each of the three groups. */
  groupColors: Record<GroupKey, string>;
  /** Each tuple is [weekStart, weekEnd], both ISO dates, inclusive. */
  weeks: [IsoDate, IsoDate][];
}

/**
 * Domain model for Bootsing — the Culture + Dancing Calendar.
 *
 * The category and genre keys are a fixed, small vocabulary (see
 * CONTEXT.md for what each one means and why), so they're modeled as
 * string literal unions rather than plain `string` — this gives
 * autocomplete and compile-time checking everywhere an event is built
 * or read, both in UI code and in the Claude tool definitions.
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
 * The three high-level groups shown as filters in the UI. A category can
 * belong to more than one group (see `catGroups` in meta.json), so an event
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
  cost: string;
  desc: string;
  link: string;
  approx: boolean;
  /** Only set when `cat === "MUS"`; `null` for every other category. */
  genre: GenreKey | null;
}

/** Fields a caller may set when creating a new event; `id` is assigned by the store. */
export type NewEventInput = Omit<CalendarEvent, "id" | "approx" | "genre"> & {
  approx?: boolean;
  genre?: GenreKey;
};

/** Fields a caller may change on an existing event; all optional except the target id. */
export type EventPatch = Partial<Omit<CalendarEvent, "id">> & { id: number };

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

export interface ChatApiResponse {
  reply: string;
  changed: boolean;
  events: CalendarEvent[];
  history: unknown[];
}

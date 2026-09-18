/**
 * Domain model for the Barcelona Cultural Calendar.
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

export const FLAG_KEYS = ["closing", "rare", "finale"] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

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
  flags: FlagKey[];
  approx: boolean;
  /** Only set when `cat === "MUS"`; `null` for every other category. */
  genre: GenreKey | null;
}

/** Fields a caller may set when creating a new event; `id` is assigned by the store. */
export type NewEventInput = Omit<CalendarEvent, "id" | "flags" | "approx" | "genre"> & {
  flags?: FlagKey[];
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
  /** Each tuple is [weekStart, weekEnd], both ISO dates, inclusive. */
  weeks: [IsoDate, IsoDate][];
}

export interface ChatApiResponse {
  reply: string;
  changed: boolean;
  events: CalendarEvent[];
  history: unknown[];
}

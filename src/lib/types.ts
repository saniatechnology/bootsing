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
 * The user's personal triage of a saved event, shown on the Home page.
 * `null` means the event is not saved and lives only on the Explore page.
 * This is orthogonal to `cat`/`genre` (the shared taxonomy).
 */
export const EVENT_STATUS_KEYS = ["boots", "maybe", "interesting"] as const;
export type EventStatus = (typeof EVENT_STATUS_KEYS)[number];

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

/** Fields a caller may set when creating a new event; `id` is assigned by the store. */
export type NewEventInput = Omit<
  CalendarEvent,
  "id" | "approx" | "genre" | "startTime" | "endTime" | "status"
> & {
  approx?: boolean;
  genre?: GenreKey;
  startTime?: string | null;
  endTime?: string | null;
  status?: EventStatus | null;
};

/** Fields a caller may change on an existing event; all optional except the target id. */
export type EventPatch = Partial<Omit<CalendarEvent, "id">> & { id: number };

/** The subset of an event shown in a proposed-action preview. */
export type EventSummary = Pick<CalendarEvent, "id" | "name" | "venue" | "start" | "end">;

/**
 * A single change the assistant proposes but has NOT yet applied. The user
 * approves each action individually; only the accepted ones are then replayed
 * server-side (see `applyActions`). `id` is the originating tool-use id, unique
 * within a proposal, and is what the UI keys its per-action toggles on.
 */
export type ProposedAction =
  | { id: string; kind: "add"; summary: string; input: NewEventInput }
  | {
      id: string;
      kind: "edit";
      summary: string;
      targetId: number;
      patch: Partial<Omit<CalendarEvent, "id">>;
      target: EventSummary;
    }
  | { id: string; kind: "delete"; summary: string; targetId: number; target: EventSummary };

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
  /** Pending changes for the user to approve; empty when the assistant only answered. */
  proposedActions: ProposedAction[];
  events: CalendarEvent[];
  history: unknown[];
}

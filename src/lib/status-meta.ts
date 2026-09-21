import type { EventStatus } from "./types";

export interface StatusMeta {
  label: string;
  emoji: string;
  /** Tooltip text describing what the status means. */
  title: string;
}

/**
 * Presentation for each saved-event status (the Home page's triage levels).
 * Typed as a complete record so adding a status to `EVENT_STATUS_KEYS` fails
 * to compile until its label and emoji are chosen here.
 */
export const STATUS_META: Record<EventStatus, StatusMeta> = {
  boots: { label: "Boots", emoji: "👢", title: "I'm going for sure" },
  maybe: { label: "Maybe", emoji: "💅", title: "Maybe" },
  interesting: { label: "Interesting", emoji: "👀", title: "Interesting" },
};

import type { CalendarEvent, CalendarMeta } from "../types";
import type { WeekRange } from "../weeks";

/** A complete event with sensible defaults; override whatever the test cares about. */
export function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 1,
    name: "Test event",
    venue: "Test venue",
    cat: "MUS",
    start: "2026-09-01",
    end: "2026-09-01",
    startTime: null,
    endTime: null,
    cost: "Free",
    desc: "",
    link: "https://example.com",
    approx: false,
    genre: null,
    status: null,
    ...overrides,
  };
}

/** The seeded calendar's weeks: a partial first week, then full Mon–Sun weeks. */
export const WEEKS: WeekRange[] = [
  ["2026-08-28", "2026-08-30"],
  ["2026-08-31", "2026-09-06"],
  ["2026-09-07", "2026-09-13"],
  ["2026-09-14", "2026-09-20"],
  ["2026-09-21", "2026-09-27"],
  ["2026-09-28", "2026-10-04"],
  ["2026-10-05", "2026-10-11"],
  ["2026-10-12", "2026-10-18"],
];

/** A small but complete `CalendarMeta`, enough for group/colour/label lookups. */
export const META: CalendarMeta = {
  cats: {
    IND: { label: "Independent art spaces", color: "#6B8F71" },
    GAL: { label: "Contemporary art & galleries", color: "#7B5EA7" },
    QUEER: { label: "Queer events", color: "#C64E8C" },
    MUS: { label: "Music", color: "#D9704B" },
    MUSPROD: { label: "Music production", color: "#B98B2E" },
    GAME: { label: "Games / anime / nerd culture", color: "#3E8FB0" },
    ARCH: { label: "World Capital of Architecture 2026", color: "#2A4B7C" },
    FASH: { label: "Fashion", color: "#A8617A" },
    TECH: { label: "Tech & software", color: "#48808A" },
    NEIGH: { label: "Neighborhood festivals", color: "#5B8C3E" },
    CHIC: { label: "Chic / standout", color: "#6E2C3A" },
    BONUS: { label: "Also on (bonus filler)", color: "#7A7A7A" },
  },
  genreLabels: {
    latin: "Latin",
    hiphop: "Hip-Hop",
    pop: "Pop",
    electronic: "Electronic / EDM",
    mixed: "Mixed lineup",
    other: "Other (rock, indie, etc.)",
  },
  groupLabels: { culture: "Culture", dancing: "Dancing", queer: "Queer" },
  groupColors: { culture: "#6B8F71", dancing: "#D9704B", queer: "#C64E8C" },
  catGroups: {
    IND: ["culture"],
    GAL: ["culture"],
    QUEER: ["queer", "dancing"],
    MUS: ["dancing"],
    MUSPROD: ["culture"],
    GAME: ["culture"],
    ARCH: ["culture"],
    FASH: ["culture"],
    TECH: ["culture"],
    NEIGH: ["culture", "dancing"],
    CHIC: ["culture"],
    BONUS: ["culture"],
  },
  weeks: WEEKS,
};

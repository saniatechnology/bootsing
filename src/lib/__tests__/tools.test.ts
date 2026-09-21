import { describe, expect, it } from "vitest";
import { executeTool, extractEventPatch, materializeNewEvent } from "../tools";
import type { ToolResult } from "../tools";
import { CATEGORY_KEYS } from "../types";
import type { CalendarEvent, CalendarMeta, NewEventInput } from "../types";

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
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
    ...overrides,
  };
}

function sampleEvents(): CalendarEvent[] {
  return [
    makeEvent({ id: 1, name: "Jazz Night", venue: "Marula", cat: "MUS", genre: "mixed", start: "2026-09-05", end: "2026-09-05" }),
    makeEvent({ id: 2, name: "Techno Rave", venue: "Razzmatazz", cat: "MUS", genre: "electronic", start: "2026-09-10", end: "2026-09-10" }),
    makeEvent({ id: 3, name: "Gallery Opening", venue: "MACBA", cat: "GAL", genre: null, start: "2026-09-12", end: "2026-09-20" }),
    makeEvent({ id: 4, name: "Queer Disco", venue: "Sala Apolo", cat: "QUEER", genre: null, start: "2026-09-15", end: "2026-09-15" }),
  ];
}

// find_events only reads meta.catGroups, so the rest of CalendarMeta is stubbed.
const catGroups = Object.fromEntries(CATEGORY_KEYS.map((c) => [c, ["culture"]])) as CalendarMeta["catGroups"];
catGroups.MUS = ["dancing"];
catGroups.QUEER = ["queer", "dancing"];
const meta = { catGroups } as unknown as CalendarMeta;

function findIds(input: Record<string, unknown>): number[] {
  const result: ToolResult = executeTool("find_events", input, sampleEvents(), meta);
  if (!("matches" in result)) throw new Error("expected a find_events result");
  return result.matches.map((m) => m.id).sort((a, b) => a - b);
}

describe("executeTool: find_events", () => {
  it("matches a case-insensitive substring against name and venue", () => {
    expect(findIds({ query: "jazz" })).toEqual([1]);
    expect(findIds({ query: "RAZZ" })).toEqual([2]);
  });

  it("filters by group via catGroups", () => {
    expect(findIds({ group: "dancing" })).toEqual([1, 2, 4]);
    expect(findIds({ group: "queer" })).toEqual([4]);
  });

  it("filters by genre and category", () => {
    expect(findIds({ genre: "electronic" })).toEqual([2]);
    expect(findIds({ cat: "GAL" })).toEqual([3]);
  });

  it("filters by date-range overlap", () => {
    expect(findIds({ from: "2026-09-11", to: "2026-09-16" })).toEqual([3, 4]);
  });

  it("combines filters with AND", () => {
    expect(findIds({ group: "dancing", from: "2026-09-11" })).toEqual([4]);
  });

  it("returns everything when no filters are given", () => {
    expect(findIds({})).toEqual([1, 2, 3, 4]);
  });
});

describe("materializeNewEvent", () => {
  function baseInput(overrides: Partial<NewEventInput>): NewEventInput {
    return {
      name: "Talk",
      venue: "Hall",
      cat: "TECH",
      start: "2026-09-08",
      end: "2026-09-08",
      cost: "Free",
      desc: "d",
      link: "https://x.dev",
      ...overrides,
    };
  }

  it("defaults approx to false and forces a null genre for non-music categories", () => {
    const event = materializeNewEvent(baseInput({ cat: "TECH", genre: "electronic" }));
    expect(event.approx).toBe(false);
    expect(event.genre).toBeNull();
  });

  it("defaults a music event's genre to 'other' when none is given", () => {
    const event = materializeNewEvent(baseInput({ cat: "MUS" }));
    expect(event.genre).toBe("other");
  });

  it("keeps an explicit music genre and approx flag", () => {
    const event = materializeNewEvent(baseInput({ cat: "MUS", genre: "latin", approx: true }));
    expect(event.genre).toBe("latin");
    expect(event.approx).toBe(true);
  });
});

describe("extractEventPatch", () => {
  it("keeps recognised fields and drops unknown or invalid ones", () => {
    const patch = extractEventPatch({
      id: 5,
      name: "New name",
      cat: "not-a-category",
      genre: "electronic",
      bogus: "ignored",
    });
    expect(patch).toEqual({ name: "New name", genre: "electronic" });
  });

  it("preserves an explicit null genre", () => {
    expect(extractEventPatch({ genre: null })).toEqual({ genre: null });
  });
});

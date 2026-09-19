import { describe, expect, it } from "vitest";
import { buildWeekLayout } from "../grid";
import type { CalendarEvent } from "../types";

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 1,
    name: "Test event",
    venue: "Test venue",
    cat: "MUS",
    start: "2026-09-01",
    end: "2026-09-01",
    cost: "Free",
    desc: "",
    link: "https://example.com",
    approx: false,
    genre: null,
    ...overrides,
  };
}

const WEEK: [string, string] = ["2026-08-31", "2026-09-06"];

describe("buildWeekLayout", () => {
  it("excludes events entirely outside the week", () => {
    const layout = buildWeekLayout([makeEvent({ start: "2026-09-10", end: "2026-09-10" })], WEEK);
    expect(layout.rows).toHaveLength(0);
  });

  it("clips a multi-week event's bar to the week's boundaries", () => {
    const layout = buildWeekLayout(
      [makeEvent({ id: 2, start: "2026-08-28", end: "2026-09-27" })],
      WEEK
    );
    expect(layout.rows).toHaveLength(1);
    // week starts 08-31, so a bar starting before the week begins at column 1
    expect(layout.rows[0].colStart).toBe(1);
    expect(layout.rows[0].span).toBe(7);
  });

  it("sorts shorter events above longer ones, regardless of insertion order", () => {
    const shortEvent = makeEvent({ id: 1, name: "short", start: "2026-09-02", end: "2026-09-02" });
    const longEvent = makeEvent({ id: 2, name: "long", start: "2026-08-31", end: "2026-09-06" });
    const layout = buildWeekLayout([longEvent, shortEvent], WEEK);
    expect(layout.rows.map((r) => r.event.name)).toEqual(["short", "long"]);
  });

  it("computes a partial week's day count from its own boundaries", () => {
    const layout = buildWeekLayout([], ["2026-08-28", "2026-08-30"]);
    expect(layout.dayCount).toBe(3);
    expect(layout.days).toHaveLength(3);
  });

  it("packs events on different days into the same top lane", () => {
    const mon = makeEvent({ id: 1, start: "2026-08-31", end: "2026-08-31" });
    const tue = makeEvent({ id: 2, start: "2026-09-01", end: "2026-09-01" });
    const layout = buildWeekLayout([mon, tue], WEEK);
    expect(layout.rows.every((r) => r.lane === 0)).toBe(true);
    expect(layout.laneCount).toBe(1);
  });

  it("pushes an overlapping event down to the next lane", () => {
    const a = makeEvent({ id: 1, start: "2026-08-31", end: "2026-08-31" });
    const b = makeEvent({ id: 2, start: "2026-08-31", end: "2026-08-31" });
    const layout = buildWeekLayout([a, b], WEEK);
    expect(layout.rows.map((r) => r.lane).sort()).toEqual([0, 1]);
    expect(layout.laneCount).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { buildHourlyWeekLayout, parseMinutes } from "../hourly";
import type { CalendarEvent } from "../types";

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
    status: "interesting",
    ...overrides,
  };
}

// Tuesday 09-01 .. Monday 09-07 (matches app week shape closely enough for tests)
const WEEK: [string, string] = ["2026-08-31", "2026-09-06"];

describe("parseMinutes", () => {
  it("parses valid times", () => {
    expect(parseMinutes("20:30")).toBe(1230);
    expect(parseMinutes("00:00")).toBe(0);
  });
  it("rejects malformed values", () => {
    expect(parseMinutes(null)).toBeNull();
    expect(parseMinutes("25:00")).toBeNull();
    expect(parseMinutes("8:5")).toBeNull();
  });
});

describe("buildHourlyWeekLayout", () => {
  it("places a timed single-day event in the right day column and minute slot", () => {
    const layout = buildHourlyWeekLayout(
      [makeEvent({ start: "2026-09-01", end: "2026-09-01", startTime: "20:30", endTime: "22:00" })],
      WEEK
    );
    expect(layout.timed).toHaveLength(1);
    const item = layout.timed[0];
    expect(item.dayIndex).toBe(1); // 08-31 is day 0, 09-01 is day 1
    expect(item.startMin).toBe(1230);
    expect(item.endMin).toBe(1320);
  });

  it("defaults the end to 90 minutes when no end time is given", () => {
    const layout = buildHourlyWeekLayout(
      [makeEvent({ start: "2026-09-01", end: "2026-09-01", startTime: "21:00", endTime: null })],
      WEEK
    );
    expect(layout.timed[0].endMin).toBe(21 * 60 + 90);
  });

  it("extends past midnight by wrapping the end forward a day", () => {
    const layout = buildHourlyWeekLayout(
      [makeEvent({ start: "2026-09-01", end: "2026-09-01", startTime: "23:30", endTime: "02:00" })],
      WEEK
    );
    expect(layout.timed[0].startMin).toBe(23 * 60 + 30);
    expect(layout.timed[0].endMin).toBe(26 * 60); // 02:00 next day
    expect(layout.axisEndMin).toBeGreaterThanOrEqual(26 * 60);
  });

  it("packs overlapping events into separate lanes", () => {
    const layout = buildHourlyWeekLayout(
      [
        makeEvent({
          id: 1,
          start: "2026-09-01",
          end: "2026-09-01",
          startTime: "20:00",
          endTime: "22:00",
        }),
        makeEvent({
          id: 2,
          start: "2026-09-01",
          end: "2026-09-01",
          startTime: "21:00",
          endTime: "23:00",
        }),
      ],
      WEEK
    );
    expect(layout.timed).toHaveLength(2);
    expect(layout.timed.every((t) => t.laneCount === 2)).toBe(true);
    const lanes = layout.timed.map((t) => t.lane).sort();
    expect(lanes).toEqual([0, 1]);
  });

  it("sends multi-day events to the untimed band", () => {
    const layout = buildHourlyWeekLayout(
      [makeEvent({ start: "2026-09-01", end: "2026-09-03", startTime: "20:00" })],
      WEEK
    );
    expect(layout.timed).toHaveLength(0);
    expect(layout.untimed).toHaveLength(1);
    expect(layout.untimed[0].colStart).toBe(2); // 09-01 is column 2
    expect(layout.untimed[0].span).toBe(3);
  });

  it("sends untimed single-day events to the band too", () => {
    const layout = buildHourlyWeekLayout(
      [makeEvent({ start: "2026-09-02", end: "2026-09-02", startTime: null })],
      WEEK
    );
    expect(layout.timed).toHaveLength(0);
    expect(layout.untimed).toHaveLength(1);
  });

  it("uses an evening default axis when nothing is timed", () => {
    const layout = buildHourlyWeekLayout(
      [makeEvent({ start: "2026-09-02", end: "2026-09-02", startTime: null })],
      WEEK
    );
    expect(layout.hasTimed).toBe(false);
    expect(layout.axisStartMin).toBe(18 * 60);
    expect(layout.axisEndMin).toBe(24 * 60);
  });
});

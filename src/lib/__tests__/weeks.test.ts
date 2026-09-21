import { describe, expect, it } from "vitest";
import {
  browseHorizon,
  isResearchableWeek,
  latestStart,
  weekForIndex,
  weekIndexForDate,
} from "../weeks";
import { WEEKS } from "./fixtures";

const LAST = WEEKS.length - 1;

describe("weekForIndex", () => {
  it("returns configured weeks by index", () => {
    expect(weekForIndex(WEEKS, 0)).toEqual(["2026-08-28", "2026-08-30"]);
    expect(weekForIndex(WEEKS, LAST)).toEqual(["2026-10-12", "2026-10-18"]);
  });

  it("continues the grid with 7-day windows after the last configured week", () => {
    expect(weekForIndex(WEEKS, LAST + 1)).toEqual(["2026-10-19", "2026-10-25"]);
    expect(weekForIndex(WEEKS, LAST + 3)).toEqual(["2026-11-02", "2026-11-08"]);
  });

  it("is undefined when nothing is configured", () => {
    expect(weekForIndex([], 0)).toBeUndefined();
  });
});

describe("weekIndexForDate", () => {
  it("finds the configured week containing a date", () => {
    expect(weekIndexForDate(WEEKS, "2026-08-29")).toBe(0);
    expect(weekIndexForDate(WEEKS, "2026-09-07")).toBe(2);
    expect(weekIndexForDate(WEEKS, "2026-10-18")).toBe(LAST);
  });

  it("clamps dates before the first week to 0", () => {
    expect(weekIndexForDate(WEEKS, "2026-01-01")).toBe(0);
  });

  it("extends into synthetic weeks after the last configured one", () => {
    expect(weekIndexForDate(WEEKS, "2026-10-19")).toBe(LAST + 1);
    expect(weekIndexForDate(WEEKS, "2026-10-25")).toBe(LAST + 1);
    expect(weekIndexForDate(WEEKS, "2026-10-26")).toBe(LAST + 2);
  });

  it("is the inverse of weekForIndex, including well past the configured list", () => {
    for (let i = 0; i <= 20; i++) {
      const week = weekForIndex(WEEKS, i)!;
      expect(weekIndexForDate(WEEKS, week[0])).toBe(i);
      expect(weekIndexForDate(WEEKS, week[1])).toBe(i);
    }
  });

  it("returns 0 for an empty list", () => {
    expect(weekIndexForDate([], "2026-09-01")).toBe(0);
  });
});

describe("isResearchableWeek", () => {
  it("accepts every configured week, including the partial first one", () => {
    for (const week of WEEKS) expect(isResearchableWeek(WEEKS, week)).toBe(true);
  });

  it("accepts synthetic weeks that continue the grid", () => {
    for (let i = LAST + 1; i <= LAST + 5; i++) {
      expect(isResearchableWeek(WEEKS, weekForIndex(WEEKS, i)!)).toBe(true);
    }
  });

  it("rejects misaligned, partial or made-up ranges", () => {
    expect(isResearchableWeek(WEEKS, ["2026-10-20", "2026-10-26"])).toBe(false); // off by a day
    expect(isResearchableWeek(WEEKS, ["2026-10-19", "2026-10-24"])).toBe(false); // 6 days
    expect(isResearchableWeek(WEEKS, ["2026-10-19", "2026-10-26"])).toBe(false); // 8 days
    expect(isResearchableWeek(WEEKS, ["2026-09-08", "2026-09-14"])).toBe(false); // inside a week
    expect(isResearchableWeek(WEEKS, ["2026-08-24", "2026-08-30"])).toBe(false); // before the first
  });

  it("rejects everything when nothing is configured", () => {
    expect(isResearchableWeek([], ["2026-09-07", "2026-09-13"])).toBe(false);
  });
});

describe("latestStart", () => {
  it("returns the latest start date, or null for no events", () => {
    expect(
      latestStart([{ start: "2026-09-05" }, { start: "2026-09-20" }, { start: "2026-09-10" }])
    ).toBe("2026-09-20");
    expect(latestStart([])).toBeNull();
  });
});

describe("browseHorizon", () => {
  it("allows 8 weeks past the week of the latest event", () => {
    expect(browseHorizon(WEEKS, "2026-09-07", LAST)).toBe(Math.max(LAST, 2 + 8));
    expect(browseHorizon(WEEKS, "2026-10-19", LAST)).toBe(LAST + 1 + 8);
  });

  it("allows 8 weeks past the floor when there are no events", () => {
    expect(browseHorizon(WEEKS, null, 3)).toBe(11);
  });

  it("never drops below the floor", () => {
    expect(browseHorizon(WEEKS, "2026-08-28", 40)).toBe(40);
  });
});

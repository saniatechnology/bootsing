import { describe, expect, it } from "vitest";
import { clipToWeek, daysBetween, fmtDateRange, parseIsoDate } from "../dates";

describe("parseIsoDate / daysBetween", () => {
  it("round-trips a date and measures whole-day gaps correctly", () => {
    const a = parseIsoDate("2026-09-01");
    const b = parseIsoDate("2026-09-10");
    expect(daysBetween(a, b)).toBe(9);
  });
});

describe("fmtDateRange", () => {
  it("formats a single day", () => {
    const d = parseIsoDate("2026-09-05");
    expect(fmtDateRange(d, d)).toBe("Sep 5");
  });
  it("formats a same-month range", () => {
    expect(fmtDateRange(parseIsoDate("2026-09-05"), parseIsoDate("2026-09-09"))).toBe("Sep 5–9");
  });
  it("formats a cross-month range", () => {
    expect(fmtDateRange(parseIsoDate("2026-08-30"), parseIsoDate("2026-09-02"))).toBe(
      "Aug 30 – Sep 2"
    );
  });
});

describe("clipToWeek", () => {
  const weekStart = parseIsoDate("2026-09-07");
  const weekEnd = parseIsoDate("2026-09-13");

  it("returns null when the range doesn't intersect the week", () => {
    expect(
      clipToWeek(parseIsoDate("2026-09-20"), parseIsoDate("2026-09-25"), weekStart, weekEnd)
    ).toBeNull();
  });

  it("clips a range that overhangs both ends of the week", () => {
    const result = clipToWeek(parseIsoDate("2026-09-01"), parseIsoDate("2026-09-30"), weekStart, weekEnd);
    expect(result).not.toBeNull();
    const [start, end] = result!;
    expect(start.getTime()).toBe(weekStart.getTime());
    expect(end.getTime()).toBe(weekEnd.getTime());
  });
});

import { describe, expect, it } from "vitest";
import { parseSubmittedEvents } from "../research";

const WEEK_START = "2026-09-07";
const WEEK_END = "2026-09-13";

const valid = {
  name: "Vernissage",
  venue: "Galeria X",
  cat: "GAL",
  start: "2026-09-10",
  end: "2026-09-10",
  cost: "Free",
  desc: "Opening night.",
  link: "https://galeriax.example/opening",
};

describe("parseSubmittedEvents", () => {
  it("keeps valid events inside the week and drops malformed ones individually", () => {
    const events = parseSubmittedEvents(
      { events: [valid, { ...valid, cat: "nonsense" }, { ...valid, name: "Second" }] },
      WEEK_START,
      WEEK_END
    );
    expect(events.map((e) => e.name)).toEqual(["Vernissage", "Second"]);
  });

  it("drops events that start outside the researched week", () => {
    const events = parseSubmittedEvents(
      {
        events: [
          { ...valid, start: "2026-09-06", end: "2026-09-06" },
          { ...valid, start: "2026-09-14", end: "2026-09-14" },
        ],
      },
      WEEK_START,
      WEEK_END
    );
    expect(events).toEqual([]);
  });

  it("clamps an end date that runs past the week, or precedes the start, to the start date", () => {
    const events = parseSubmittedEvents(
      {
        events: [
          { ...valid, start: "2026-09-12", end: "2026-09-30" },
          { ...valid, start: "2026-09-12", end: "2026-09-01" },
          { ...valid, start: "2026-09-08", end: "2026-09-13" },
        ],
      },
      WEEK_START,
      WEEK_END
    );
    expect(events.map((e) => e.end)).toEqual(["2026-09-12", "2026-09-12", "2026-09-13"]);
  });

  it("tolerates a payload with no usable events array", () => {
    expect(parseSubmittedEvents({}, WEEK_START, WEEK_END)).toEqual([]);
    expect(parseSubmittedEvents(null, WEEK_START, WEEK_END)).toEqual([]);
    expect(parseSubmittedEvents({ events: "nope" }, WEEK_START, WEEK_END)).toEqual([]);
  });
});

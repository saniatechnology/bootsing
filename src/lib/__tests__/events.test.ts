import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, materializeNewEvent, summarizeEvent } from "../events";
import type { NewEventInput } from "../validation";
import { makeEvent } from "./fixtures";

function baseInput(overrides: Partial<NewEventInput> = {}): NewEventInput {
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

describe("materializeNewEvent", () => {
  it("defaults approx to false and forces a null genre for non-music categories", () => {
    const event = materializeNewEvent(baseInput({ cat: "TECH", genre: "electronic" }));
    expect(event.approx).toBe(false);
    expect(event.genre).toBeNull();
  });

  it("defaults a music event's genre to 'other' when none is given", () => {
    expect(materializeNewEvent(baseInput({ cat: "MUS" })).genre).toBe("other");
  });

  it("keeps an explicit music genre and approx flag", () => {
    const event = materializeNewEvent(baseInput({ cat: "MUS", genre: "latin", approx: true }));
    expect(event.genre).toBe("latin");
    expect(event.approx).toBe(true);
  });

  it("normalises missing times to null and starts unsaved", () => {
    const event = materializeNewEvent(baseInput({ startTime: "21:00" }));
    expect(event.startTime).toBe("21:00");
    expect(event.endTime).toBeNull();
    expect(event.status).toBeNull();
  });
});

describe("summarizeEvent", () => {
  it("keeps only the identifying fields", () => {
    const event = makeEvent({
      id: 7,
      name: "N",
      venue: "V",
      start: "2026-09-01",
      end: "2026-09-02",
    });
    expect(summarizeEvent(event)).toEqual({
      id: 7,
      name: "N",
      venue: "V",
      start: "2026-09-01",
      end: "2026-09-02",
    });
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts absolute http and https URLs", () => {
    expect(isSafeHttpUrl("https://example.com/a?b=c")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });

  it("rejects other schemes, relative paths and empty strings", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpUrl("example.com")).toBe(false);
    expect(isSafeHttpUrl("/relative")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });
});

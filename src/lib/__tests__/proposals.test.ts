import { describe, expect, it } from "vitest";
import { buildProposedAction, describePatch } from "../proposals";
import { makeEvent } from "./fixtures";

const events = [
  makeEvent({ id: 1, name: "Jazz Night", venue: "Marula", start: "2026-09-05", end: "2026-09-05" }),
  makeEvent({ id: 2, name: "Expo", venue: "MACBA", start: "2026-09-12", end: "2026-09-20" }),
];

const validAdd = {
  name: "Open Mic",
  venue: "Bar Nou",
  cat: "MUS",
  start: "2026-09-09",
  end: "2026-09-09",
  cost: "Free",
  desc: "Sign up at the door.",
  link: "https://barnou.example",
  genre: "pop",
};

describe("buildProposedAction: add_event", () => {
  it("builds an add proposal with a one-line summary", () => {
    const action = buildProposedAction({ id: "tu_1", name: "add_event", input: validAdd }, events);
    expect(action).toMatchObject({
      id: "tu_1",
      kind: "add",
      summary: 'Add "Open Mic" at Bar Nou (2026-09-09)',
    });
    expect(action?.kind === "add" && action.input.genre).toBe("pop");
  });

  it("shows a date range for multi-day events", () => {
    const action = buildProposedAction(
      { id: "tu", name: "add_event", input: { ...validAdd, end: "2026-09-11" } },
      events
    );
    expect(action?.summary).toBe('Add "Open Mic" at Bar Nou (2026-09-09 to 2026-09-11)');
  });

  it("drops an add whose input fails validation", () => {
    expect(
      buildProposedAction(
        { id: "tu", name: "add_event", input: { ...validAdd, start: "Friday" } },
        events
      )
    ).toBeNull();
    expect(
      buildProposedAction(
        { id: "tu", name: "add_event", input: { ...validAdd, genre: "techno" } },
        events
      )
    ).toBeNull();
  });
});

describe("buildProposedAction: edit_event", () => {
  it("resolves the target and separates the id from the patch", () => {
    const action = buildProposedAction(
      { id: "tu_2", name: "edit_event", input: { id: 1, start: "2026-09-06", end: "2026-09-06" } },
      events
    );
    expect(action).toEqual({
      id: "tu_2",
      kind: "edit",
      targetId: 1,
      patch: { start: "2026-09-06", end: "2026-09-06" },
      target: {
        id: 1,
        name: "Jazz Night",
        venue: "Marula",
        start: "2026-09-05",
        end: "2026-09-05",
      },
      summary: 'Edit "Jazz Night": start → "2026-09-06", end → "2026-09-06"',
    });
  });

  it("drops edits for unknown ids or invalid fields", () => {
    expect(
      buildProposedAction({ id: "tu", name: "edit_event", input: { id: 99, cost: "€5" } }, events)
    ).toBeNull();
    expect(
      buildProposedAction({ id: "tu", name: "edit_event", input: { id: 1, cat: "nope" } }, events)
    ).toBeNull();
    expect(
      buildProposedAction({ id: "tu", name: "edit_event", input: { cost: "€5" } }, events)
    ).toBeNull();
  });

  it("ignores any status the model tries to set", () => {
    const action = buildProposedAction(
      { id: "tu", name: "edit_event", input: { id: 1, status: "boots", cost: "€5" } },
      events
    );
    expect(action?.kind === "edit" && action.patch).toEqual({ cost: "€5" });
  });
});

describe("buildProposedAction: delete_event", () => {
  it("resolves the target and summarises it", () => {
    const action = buildProposedAction(
      { id: "tu_3", name: "delete_event", input: { id: 2 } },
      events
    );
    expect(action).toMatchObject({
      kind: "delete",
      targetId: 2,
      summary: 'Delete "Expo" at MACBA',
    });
  });

  it("drops deletes for unknown ids and unknown tools", () => {
    expect(
      buildProposedAction({ id: "tu", name: "delete_event", input: { id: 7 } }, events)
    ).toBeNull();
    expect(buildProposedAction({ id: "tu", name: "web_search", input: {} }, events)).toBeNull();
  });
});

describe("describePatch", () => {
  it("labels fields and JSON-encodes values", () => {
    expect(describePatch({ startTime: "21:00", genre: null, approx: true })).toBe(
      'start time → "21:00", genre → null, approx flag → true'
    );
  });

  it("says so when nothing changes", () => {
    expect(describePatch({})).toBe("no changes");
  });
});

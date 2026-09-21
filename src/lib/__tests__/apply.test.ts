import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProposedAction } from "../validation";
import { makeEvent } from "./fixtures";

vi.mock("../store", () => ({
  readEvents: vi.fn(),
  insertEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

import { deleteEvent, insertEvent, readEvents, updateEvent } from "../store";
import { applyActions } from "../apply";

const target = {
  id: 1,
  name: "Jazz Night",
  venue: "Marula",
  start: "2026-09-05",
  end: "2026-09-05",
};

const actions: ProposedAction[] = [
  {
    id: "a",
    kind: "add",
    summary: 'Add "Open Mic"',
    input: {
      name: "Open Mic",
      venue: "Bar",
      cat: "MUS",
      start: "2026-09-09",
      end: "2026-09-09",
      cost: "Free",
      desc: "",
      link: "",
    },
  },
  {
    id: "b",
    kind: "edit",
    summary: 'Edit "Jazz Night"',
    targetId: 1,
    patch: { cost: "€5" },
    target,
  },
  { id: "c", kind: "delete", summary: 'Delete "Gone"', targetId: 9, target: { ...target, id: 9 } },
];

describe("applyActions", () => {
  beforeEach(() => {
    vi.mocked(readEvents).mockResolvedValue([makeEvent({ id: 1 })]);
    vi.mocked(insertEvent).mockResolvedValue(makeEvent({ id: 2 }));
    vi.mocked(updateEvent).mockResolvedValue(makeEvent({ id: 1, cost: "€5" }));
    vi.mocked(deleteEvent).mockResolvedValue(null);
  });

  it("applies each action independently and reports per-action outcomes", async () => {
    const result = await applyActions(actions);
    expect(result.applied).toEqual([
      { actionId: "a", ok: true, summary: 'Add "Open Mic"', error: undefined },
      { actionId: "b", ok: true, summary: 'Edit "Jazz Night"', error: undefined },
      { actionId: "c", ok: false, summary: 'Delete "Gone"', error: "No event with id 9" },
    ]);
    expect(result.reply).toBe(
      [
        "Applied 2 changes:",
        '• Add "Open Mic"',
        '• Edit "Jazz Night"',
        "Couldn't apply 1:",
        '• Delete "Gone" — No event with id 9',
      ].join("\n")
    );
    expect(updateEvent).toHaveBeenCalledWith(1, { cost: "€5" });
  });

  it("captures a thrown store error on one action without aborting the rest", async () => {
    vi.mocked(insertEvent).mockRejectedValue(new Error("db down"));
    const result = await applyActions(actions.slice(0, 2));
    expect(result.applied.map((a) => [a.ok, a.error])).toEqual([
      [false, "db down"],
      [true, undefined],
    ]);
  });

  it("re-reads the full event list exactly once, after all writes", async () => {
    const result = await applyActions(actions);
    expect(readEvents).toHaveBeenCalledTimes(1);
    expect(result.events).toEqual([makeEvent({ id: 1 })]);
  });

  it("has a distinct reply for an empty batch", async () => {
    expect((await applyActions([])).reply).toBe("No changes were applied.");
  });
});

import { describe, expect, it } from "vitest";
import { removeFromSet, toggleAllInSet, toggleInSet } from "../selection";

describe("toggleInSet", () => {
  it("adds a missing id and removes a present one, without mutating the input", () => {
    const base = new Set([1]);
    const added = toggleInSet(base, 2);
    expect([...added]).toEqual([1, 2]);
    expect([...toggleInSet(added, 1)]).toEqual([2]);
    expect([...base]).toEqual([1]);
  });
});

describe("toggleAllInSet", () => {
  it("selects all when any id is unselected", () => {
    expect([...toggleAllInSet(new Set([1]), [1, 2, 3])].sort()).toEqual([1, 2, 3]);
  });

  it("deselects all when every id is already selected", () => {
    expect([...toggleAllInSet(new Set([1, 2, 3, 9]), [1, 2, 3])]).toEqual([9]);
  });

  it("is a no-op copy for an empty id list", () => {
    const base = new Set([4]);
    const next = toggleAllInSet(base, []);
    expect(next).not.toBe(base);
    expect([...next]).toEqual([4]);
  });
});

describe("removeFromSet", () => {
  it("removes the id if present", () => {
    expect([...removeFromSet(new Set([1, 2]), 1)]).toEqual([2]);
    expect([...removeFromSet(new Set([1, 2]), 5)]).toEqual([1, 2]);
  });
});

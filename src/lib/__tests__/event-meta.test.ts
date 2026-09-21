import { describe, expect, it } from "vitest";
import { groupLabelsOf, groupsOf, matchesGroup, primaryGroupColor } from "../event-meta";
import type { CalendarMeta } from "../types";
import { META, makeEvent } from "./fixtures";

describe("groupsOf / groupLabelsOf", () => {
  it("returns the configured groups for the event's category", () => {
    expect(groupsOf(META, makeEvent({ cat: "QUEER" }))).toEqual(["queer", "dancing"]);
    expect(groupLabelsOf(META, makeEvent({ cat: "QUEER" }))).toBe("Queer · Dancing");
    expect(groupLabelsOf(META, makeEvent({ cat: "GAL" }))).toBe("Culture");
  });
});

describe("primaryGroupColor", () => {
  it("uses the first group's colour", () => {
    expect(primaryGroupColor(META, makeEvent({ cat: "NEIGH" }))).toBe(META.groupColors.culture);
    expect(primaryGroupColor(META, makeEvent({ cat: "MUS" }))).toBe(META.groupColors.dancing);
  });

  it("falls back to the muted text colour when the category maps to no group", () => {
    const meta: CalendarMeta = { ...META, catGroups: { ...META.catGroups, MUS: [] } };
    expect(primaryGroupColor(meta, makeEvent({ cat: "MUS" }))).toBe("var(--text-muted)");
  });
});

describe("matchesGroup", () => {
  it("shows everything for 'all' and filters by membership otherwise", () => {
    const queer = makeEvent({ cat: "QUEER" });
    expect(matchesGroup(META, queer, "all")).toBe(true);
    expect(matchesGroup(META, queer, "dancing")).toBe(true);
    expect(matchesGroup(META, queer, "culture")).toBe(false);
  });
});

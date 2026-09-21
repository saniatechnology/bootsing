import { describe, expect, it } from "vitest";
import { buildResearchPrompt } from "../research-prompt";
import { buildSystemPrompt } from "../system-prompt";
import { WEEKS, makeEvent } from "./fixtures";

describe("buildSystemPrompt", () => {
  const base = { todayIso: "2026-09-22", currentWeekIndex: 4, weeks: WEEKS, selectedEvents: [] };

  it("embeds today's date and marks the current week in the week list", () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toContain("Today's date is 2026-09-22");
    expect(prompt).toContain("5. 2026-09-21 to 2026-09-27  <- current week");
    expect(prompt).not.toContain("6. 2026-09-28 to 2026-10-04  <- current week");
  });

  it("omits the selected-events block when nothing is selected, and lists ids when it is", () => {
    expect(buildSystemPrompt(base)).not.toContain("manually selected");
    const withSelection = buildSystemPrompt({
      ...base,
      selectedEvents: [makeEvent({ id: 7, name: "Jazz Night", venue: "Marula" })],
    });
    expect(withSelection).toContain("manually selected");
    expect(withSelection).toContain('id 7: "Jazz Night" at Marula (2026-09-01)');
  });

  it("copes with an index past the configured weeks and with no weeks at all", () => {
    expect(buildSystemPrompt({ ...base, currentWeekIndex: 40 })).not.toContain("<- current week");
    expect(buildSystemPrompt({ ...base, weeks: [] })).toContain("(no weeks configured)");
  });

  it("explains the shared taxonomy", () => {
    expect(buildSystemPrompt(base)).toContain("reggaeton / salsa / bachata -> latin");
  });
});

describe("buildResearchPrompt", () => {
  const ctx = {
    weekStart: "2026-10-19",
    weekEnd: "2026-10-25",
    todayIso: "2026-09-22",
    preferences: {
      intro: "  What I like.  ",
      sections: [
        {
          title: "Venues",
          note: "Favourites first.",
          items: [{ label: "Apolo", detail: "Club" }, { label: "MACBA" }],
        },
        { title: "Skip", items: [], emptyText: "Nothing yet." },
        { title: "Also", items: [] },
      ],
    },
  };

  it("states the week, today's date and the submit contract", () => {
    const prompt = buildResearchPrompt(ctx);
    expect(prompt).toContain("between 2026-10-19 and 2026-10-25");
    expect(prompt).toContain("Today's date is 2026-09-22");
    expect(prompt).toContain("call submit_week_events exactly once");
  });

  it("renders preferences as headed lists, using emptyText or a placeholder for empty sections", () => {
    const prompt = buildResearchPrompt(ctx);
    expect(prompt).toContain("What I like.");
    expect(prompt).toContain("## Venues\nFavourites first.\n- Apolo: Club\n- MACBA");
    expect(prompt).toContain("## Skip\nNothing yet.");
    expect(prompt).toContain("## Also\n(none specified)");
  });

  it("explains the shared taxonomy", () => {
    expect(buildResearchPrompt(ctx)).toContain("Music genre tags (MUS category only)");
  });
});

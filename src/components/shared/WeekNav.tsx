"use client";

import type { WeekNavigation } from "@/hooks/useWeekNavigation";

/** "This week" plus previous/next buttons, driven by `useWeekNavigation`. */
export function WeekNav({
  nav,
}: {
  nav: Pick<WeekNavigation, "canGoPrev" | "canGoNext" | "goPrev" | "goNext" | "goToThisWeek">;
}) {
  return (
    <div className="week-nav">
      <button type="button" className="nav-btn nav-today" onClick={nav.goToThisWeek}>
        This week
      </button>
      <button
        type="button"
        className="nav-btn"
        onClick={nav.goPrev}
        disabled={!nav.canGoPrev}
        aria-label="Previous week"
      >
        &lsaquo;
      </button>
      <button
        type="button"
        className="nav-btn"
        onClick={nav.goNext}
        disabled={!nav.canGoNext}
        aria-label="Next week"
      >
        &rsaquo;
      </button>
    </div>
  );
}

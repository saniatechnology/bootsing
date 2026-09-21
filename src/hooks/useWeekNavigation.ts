"use client";

import { useState } from "react";
import { toIsoDate } from "@/lib/dates";
import { weekForIndex, weekIndexForDate } from "@/lib/weeks";
import type { WeekRange } from "@/lib/weeks";

export interface WeekNavigation {
  weekIndex: number;
  /** The visible week; undefined only when no weeks are configured. */
  week: WeekRange | undefined;
  thisWeekIndex: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  goPrev: () => void;
  goNext: () => void;
  goToThisWeek: () => void;
  goTo: (index: number) => void;
}

/**
 * Which week is on screen. Navigation is bounded below by the first configured
 * week and above by `maxIndex`, which the caller derives from `thisWeekIndex`
 * and its own data (how far past the latest event the user may browse).
 */
export function useWeekNavigation(
  weeks: WeekRange[],
  initialIndex: number,
  maxIndex: (thisWeekIndex: number) => number
): WeekNavigation {
  const [weekIndex, setWeekIndex] = useState(initialIndex);
  const thisWeekIndex = weekIndexForDate(weeks, toIsoDate(new Date()));
  const max = maxIndex(thisWeekIndex);

  return {
    weekIndex,
    week: weekForIndex(weeks, weekIndex),
    thisWeekIndex,
    canGoPrev: weekIndex > 0,
    canGoNext: weekIndex < max,
    goPrev: () => setWeekIndex((i) => Math.max(0, i - 1)),
    goNext: () => setWeekIndex((i) => Math.min(max, i + 1)),
    goToThisWeek: () => setWeekIndex(thisWeekIndex),
    goTo: setWeekIndex,
  };
}

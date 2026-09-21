"use client";

import { useRef, useState } from "react";
import { api, errorMessage, isAbortError } from "@/lib/api";
import { reduceProgress } from "@/lib/progress";
import type { ProgressLine } from "@/lib/progress";
import type { CalendarEvent } from "@/lib/types";
import type { WeekRange } from "@/lib/weeks";
import type { ErrorReporter } from "./useConnectionStatus";

/**
 * The AI operation currently running, if any. Only one may run at a time:
 * research for a given week, or a chat turn.
 */
export type ActiveRequest = { kind: "research"; weekIndex: number } | { kind: "chat" } | null;

interface UseResearchOptions extends ErrorReporter {
  activeRequest: ActiveRequest;
  setActiveRequest: (next: ActiveRequest) => void;
  /** Receives the full event list once the week has been replaced. */
  onEvents: (events: CalendarEvent[]) => void;
}

export interface Research {
  /** Live progress for the run in flight; empty when idle. */
  lines: ProgressLine[];
  start: (week: WeekRange, weekIndex: number) => Promise<void>;
  cancel: () => void;
}

/** Drives the "research this week" flow: the streaming request, its progress lines and cancellation. */
export function useResearch({
  activeRequest,
  setActiveRequest,
  onEvents,
  reportError,
  clearError,
}: UseResearchOptions): Research {
  const [lines, setLines] = useState<ProgressLine[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  async function start(week: WeekRange, weekIndex: number) {
    if (activeRequest) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setActiveRequest({ kind: "research", weekIndex });
    setLines([{ kind: "stage", text: "Starting…" }]);
    try {
      const result = await api.research(week, controller.signal, (event) =>
        setLines((prev) => reduceProgress(prev, event))
      );
      onEvents(result.events);
      clearError();
    } catch (err) {
      if (!isAbortError(err)) reportError(errorMessage(err, "Couldn't research this week."));
    } finally {
      setActiveRequest(null);
      setLines([]);
      abortRef.current = null;
    }
  }

  return { lines, start, cancel: () => abortRef.current?.abort() };
}

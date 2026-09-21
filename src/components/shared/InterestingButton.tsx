"use client";

import type { CalendarEvent } from "@/lib/types";

/**
 * Explore's save toggle: an unsaved event becomes "interesting" (and appears
 * on Home); a saved event of any status goes back to Explore-only.
 */
export function InterestingButton({
  event,
  onToggle,
}: {
  event: CalendarEvent;
  onToggle: (event: CalendarEvent) => void;
}) {
  const saved = event.status !== null;
  return (
    <button
      type="button"
      className={`ev-action-btn ev-action-star${saved ? " is-saved" : ""}`}
      aria-pressed={saved}
      title={saved ? "Saved to Home — click to remove" : "Mark as interesting"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(event);
      }}
    >
      <span className="ev-action-emoji" aria-hidden="true">
        👀
      </span>
      {saved ? "Saved" : "Interesting"}
    </button>
  );
}

"use client";

import type { CalendarEvent, EventStatus } from "@/lib/types";

/** Shared label + emoji for each saved-event status, reused by filters. */
export const STATUS_META: Record<EventStatus, { label: string; emoji: string; title: string }> = {
  boots: { label: "Boots", emoji: "👢", title: "I'm going for sure" },
  maybe: { label: "Maybe", emoji: "🤷‍♀️", title: "Maybe" },
  interesting: { label: "Interesting", emoji: "👀", title: "Interesting" },
};

const OPTIONS: EventStatus[] = ["boots", "maybe", "interesting"];

/**
 * The Home triage control: pick Boots / Maybe / Interesting for a saved event,
 * or Remove it (status -> null) to send it back to Explore-only.
 */
export function StatusControls({
  event,
  onSetStatus,
}: {
  event: CalendarEvent;
  onSetStatus: (id: number, status: EventStatus | null) => void;
}) {
  return (
    <div className="status-controls" onClick={(e) => e.stopPropagation()}>
      {OPTIONS.map((value) => {
        const meta = STATUS_META[value];
        const active = event.status === value;
        return (
          <button
            key={value}
            type="button"
            className={`status-chip status-${value}${active ? " is-active" : ""}`}
            aria-pressed={active}
            title={meta.title}
            onClick={() => onSetStatus(event.id, value)}
          >
            <span className="status-chip-emoji" aria-hidden="true">
              {meta.emoji}
            </span>
            <span className="status-chip-label">{meta.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className="status-chip status-remove"
        title="Remove from Home"
        aria-label={`Remove ${event.name} from Home`}
        onClick={() => onSetStatus(event.id, null)}
      >
        <span className="status-chip-emoji" aria-hidden="true">
          🗑️
        </span>
        <span className="status-chip-label">Remove</span>
      </button>
    </div>
  );
}

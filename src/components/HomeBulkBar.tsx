"use client";

import { useState } from "react";
import type { CalendarEvent } from "@/lib/types";

interface HomeBulkBarProps {
  selectedEvents: CalendarEvent[];
  onEventsChanged: (events: CalendarEvent[]) => void;
  onClearSelection: () => void;
  reportError: (message: string) => void;
  clearError: () => void;
}

/**
 * Bulk actions for the Home page: clear the selection, or remove the rating
 * from every selected event (status -> null), sending them back to Explore.
 */
export function HomeBulkBar({
  selectedEvents,
  onEventsChanged,
  onClearSelection,
  reportError,
  clearError,
}: HomeBulkBarProps) {
  const [removing, setRemoving] = useState(false);
  const count = selectedEvents.length;
  const active = count > 0;

  async function handleRemove() {
    if (removing || count === 0) return;
    setRemoving(true);
    try {
      let latest: CalendarEvent[] | null = null;
      for (const ev of selectedEvents) {
        const res = await fetch(`/api/events/${ev.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Couldn't update “${ev.name}”`);
        latest = data.events as CalendarEvent[];
      }
      if (latest) onEventsChanged(latest);
      clearError();
      onClearSelection();
    } catch (err) {
      reportError(err instanceof Error ? err.message : "network error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`bulk-fab bulk-clear-fab${active ? " is-visible" : ""}`}
        aria-label="Clear selection"
        title="Clear selection"
        tabIndex={active ? 0 : -1}
        aria-hidden={!active}
        onClick={() => active && onClearSelection()}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          close
        </span>
      </button>

      <button
        type="button"
        className={`bulk-fab bulk-delete-fab${active ? " is-visible" : ""}`}
        aria-label={`Remove ${count} event${count === 1 ? "" : "s"} from Home`}
        title="Remove rating (back to Explore)"
        tabIndex={active ? 0 : -1}
        aria-hidden={!active}
        onClick={() => active && handleRemove()}
        disabled={removing}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {removing ? "hourglass_top" : "delete"}
        </span>
      </button>
    </>
  );
}

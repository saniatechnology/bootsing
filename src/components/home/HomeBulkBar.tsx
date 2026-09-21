"use client";

import { useState } from "react";
import type { ErrorReporter } from "@/hooks/useConnectionStatus";
import { api, errorMessage } from "@/lib/api";
import type { CalendarEvent } from "@/lib/types";
import { BulkFab } from "../shared/BulkFab";

interface HomeBulkBarProps extends ErrorReporter {
  selectedEvents: CalendarEvent[];
  onEventsChanged: (events: CalendarEvent[]) => void;
  onClearSelection: () => void;
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
    if (removing || !active) return;
    setRemoving(true);
    try {
      onEventsChanged(
        await api.updateEvents(
          selectedEvents.map((e) => e.id),
          { status: null }
        )
      );
      clearError();
      onClearSelection();
    } catch (err) {
      reportError(errorMessage(err, "Couldn't update the selected events."));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <BulkFab
        className="bulk-clear-fab"
        label="Clear selection"
        title="Clear selection"
        active={active}
        onClick={onClearSelection}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          close
        </span>
      </BulkFab>

      <BulkFab
        className="bulk-delete-fab"
        label={`Remove ${count} event${count === 1 ? "" : "s"} from Home`}
        title="Remove rating (back to Explore)"
        active={active}
        disabled={removing}
        onClick={handleRemove}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {removing ? "hourglass_top" : "delete"}
        </span>
      </BulkFab>
    </>
  );
}

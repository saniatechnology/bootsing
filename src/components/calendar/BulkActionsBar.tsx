"use client";

import { useState } from "react";
import type { ErrorReporter } from "@/hooks/useConnectionStatus";
import { api, errorMessage } from "@/lib/api";
import type { CalendarEvent } from "@/lib/types";
import { BulkFab } from "../shared/BulkFab";
import { Modal } from "../shared/Modal";

interface BulkActionsBarProps extends ErrorReporter {
  selectedEvents: CalendarEvent[];
  onEventsChanged: (events: CalendarEvent[]) => void;
  onClearSelection: () => void;
}

/**
 * Explore's floating actions for the current selection: clear it, mark every
 * selected event as interesting (saving it to Home), or delete them after
 * confirmation.
 */
export function BulkActionsBar({
  selectedEvents,
  onEventsChanged,
  onClearSelection,
  reportError,
  clearError,
}: BulkActionsBarProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selectedEvents.length;
  const active = count > 0;
  const ids = selectedEvents.map((e) => e.id);
  const plural = count === 1 ? "" : "s";

  function closeModal() {
    if (deleting) return;
    setConfirming(false);
    setError(null);
  }

  async function handleMarkInteresting() {
    if (marking || !active) return;
    setMarking(true);
    try {
      onEventsChanged(await api.updateEvents(ids, { status: "interesting" }));
      clearError();
      onClearSelection();
    } catch (err) {
      reportError(errorMessage(err, "Couldn't save the selected events."));
    } finally {
      setMarking(false);
    }
  }

  async function handleConfirmDelete() {
    if (deleting || !active) return;
    setDeleting(true);
    setError(null);
    try {
      onEventsChanged(await api.deleteEvents(ids));
      clearError();
      onClearSelection();
      setConfirming(false);
    } catch (err) {
      const message = errorMessage(err, "Couldn't delete the selected events.");
      setError(message);
      reportError(message);
    } finally {
      setDeleting(false);
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
        className="bulk-interesting-fab"
        label={`Mark ${count} selected event${plural} as interesting`}
        title="Mark selected as interesting (adds to Home)"
        active={active}
        disabled={marking}
        onClick={handleMarkInteresting}
      >
        {marking ? (
          <span className="material-symbols-outlined" aria-hidden="true">
            hourglass_top
          </span>
        ) : (
          <span className="bulk-fab-emoji" aria-hidden="true">
            👀
          </span>
        )}
      </BulkFab>

      <BulkFab
        className="bulk-delete-fab"
        label={`Delete ${count} selected event${plural}`}
        title="Delete selected events"
        active={active}
        onClick={() => setConfirming(true)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          delete
        </span>
      </BulkFab>

      {confirming && (
        <Modal
          title={`Delete ${count} event${plural}?`}
          ariaLabel="Confirm delete"
          onClose={closeModal}
          closeDisabled={deleting}
        >
          <div className="bulk-delete-body">
            <p className="bulk-delete-lead">
              This can&rsquo;t be undone. The following will be permanently deleted:
            </p>
            <ul className="bulk-delete-list">
              {selectedEvents.map((ev) => (
                <li key={ev.id}>
                  <span className="bulk-delete-name">{ev.name}</span>
                  <span className="bulk-delete-meta">
                    {ev.venue} &middot; {ev.start}
                  </span>
                </li>
              ))}
            </ul>
            {error && <p className="bulk-delete-error">{error}</p>}
            <div className="bulk-delete-actions">
              <button type="button" className="bd-cancel" onClick={closeModal} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="bd-confirm"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : `Delete ${count}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

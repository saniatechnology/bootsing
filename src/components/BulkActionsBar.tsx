"use client";

import { useState } from "react";
import type { CalendarEvent } from "@/lib/types";

interface BulkActionsBarProps {
  selectedEvents: CalendarEvent[];
  onEventsChanged: (events: CalendarEvent[]) => void;
  onClearSelection: () => void;
  reportError: (message: string) => void;
  clearError: () => void;
}

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

  function closeModal() {
    if (deleting) return;
    setConfirming(false);
    setError(null);
  }

  // Mark every selected event as "interesting" so it shows up on Home.
  async function handleMarkInteresting() {
    if (marking || count === 0) return;
    setMarking(true);
    try {
      let latest: CalendarEvent[] | null = null;
      for (const ev of selectedEvents) {
        const res = await fetch(`/api/events/${ev.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "interesting" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Couldn't save “${ev.name}”`);
        latest = data.events as CalendarEvent[];
      }
      if (latest) onEventsChanged(latest);
      clearError();
      onClearSelection();
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      reportError(message);
    } finally {
      setMarking(false);
    }
  }

  async function handleConfirmDelete() {
    if (deleting || count === 0) return;
    setDeleting(true);
    setError(null);
    try {
      let latest: CalendarEvent[] | null = null;
      for (const ev of selectedEvents) {
        const res = await fetch(`/api/events/${ev.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Couldn't delete “${ev.name}”`);
        latest = data.events as CalendarEvent[];
      }
      if (latest) onEventsChanged(latest);
      clearError();
      onClearSelection();
      setConfirming(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      setError(message);
      reportError(message);
    } finally {
      setDeleting(false);
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
        className={`bulk-fab bulk-interesting-fab${active ? " is-visible" : ""}`}
        aria-label={`Mark ${count} selected event${count === 1 ? "" : "s"} as interesting`}
        title="Mark selected as interesting (adds to Home)"
        tabIndex={active ? 0 : -1}
        aria-hidden={!active}
        onClick={() => active && handleMarkInteresting()}
        disabled={marking}
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
      </button>

      <button
        type="button"
        className={`bulk-fab bulk-delete-fab${active ? " is-visible" : ""}`}
        aria-label={`Delete ${count} selected event${count === 1 ? "" : "s"}`}
        title="Delete selected events"
        tabIndex={active ? 0 : -1}
        aria-hidden={!active}
        onClick={() => active && setConfirming(true)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          delete
        </span>
      </button>

      {confirming && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          onClick={closeModal}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>
                Delete {count} event{count === 1 ? "" : "s"}?
              </span>
              <button type="button" aria-label="Close" onClick={closeModal}>
                &times;
              </button>
            </div>

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
                <button
                  type="button"
                  className="bd-cancel"
                  onClick={closeModal}
                  disabled={deleting}
                >
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
          </div>
        </div>
      )}
    </>
  );
}

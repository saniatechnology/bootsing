"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatPanel } from "./ChatPanel";
import { BulkActionsBar } from "./BulkActionsBar";
import { EventForm } from "./EventForm";
import { FilterBar } from "./FilterBar";
import { WeekSection } from "./WeekSection";
import { toIsoDate } from "@/lib/dates";
import { weekIndexForDate } from "@/lib/grid";
import type { CalendarEvent, CalendarMeta, GroupKey } from "@/lib/types";

const OFFLINE_TITLE = "Diva down :/"
const OFFLINE_MESSAGE = "You appear to be offline. Check your internet connection and try again.";

/** Track the browser's online/offline state. */
function useOffline(): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline;
}

/** Topbar icon shown only on a connection/request problem; opens a modal with the detail. */
function StatusIndicator({
  error,
  offline,
  onDismiss,
}: {
  error: string | null;
  offline: boolean;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!offline && error === null) return null;

  const message = offline ? OFFLINE_MESSAGE : error;
  const title = offline ? OFFLINE_TITLE : "Something went wrong";

  return (
    <>
      <button
        type="button"
        className="status-indicator"
        aria-label={offline ? OFFLINE_TITLE : "Connection problem — view details"}
        title={offline ? OFFLINE_TITLE : "Connection problem"}
        onClick={() => setOpen(true)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {offline ? "cloud_off" : "error"}
        </span>
      </button>

      {open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Connection status" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>{title}</span>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                &times;
              </button>
            </div>
            <div className="status-modal-body">
              <p className="status-modal-message">{message}</p>
              {!offline && error !== null && (
                <div className="status-modal-actions">
                  <button
                    type="button"
                    className="status-dismiss"
                    onClick={() => {
                      onDismiss();
                      setOpen(false);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface CalendarAppProps {
  initialEvents: CalendarEvent[];
  meta: CalendarMeta;
}

export function CalendarApp({ initialEvents, meta }: CalendarAppProps) {
  const [events, setEvents] = useState(initialEvents);
  const [activeGroup, setActiveGroup] = useState<GroupKey | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const thisWeekIndex = weekIndexForDate(meta.weeks, toIsoDate(new Date()));
  const [weekIndex, setWeekIndex] = useState(thisWeekIndex);

  const lastWeek = meta.weeks.length - 1;
  const week = meta.weeks[weekIndex];

  // null = form closed; { newOn } = adding on that date; a CalendarEvent = editing it.
  const [formTarget, setFormTarget] = useState<CalendarEvent | { newOn: string } | null>(null);
  const addingOn = formTarget !== null && "newOn" in formTarget ? formTarget.newOn : null;

  const [connError, setConnError] = useState<string | null>(null);
  const offline = useOffline();
  const reportError = (message: string) => setConnError(message);
  const clearError = () => setConnError(null);

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelected() {
    setSelectedIds(new Set());
  }

  const selectedEvents = events.filter((e) => selectedIds.has(e.id));

  async function handleDelete(event: CalendarEvent) {
    if (!window.confirm(`Delete “${event.name}”? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        reportError(data.error ?? "Couldn't delete the event.");
        return;
      }
      clearError();
      setEvents(data.events as CalendarEvent[]);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Network error.");
    }
  }

  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <h1>Bootsing</h1>
          <div className="topbar-actions">
            <StatusIndicator error={connError} offline={offline} onDismiss={clearError} />
            <Link href="/configuration" className="settings-btn" aria-label="Open configuration" title="Configuration">
              <span className="material-symbols-outlined" aria-hidden="true">
                settings
              </span>
            </Link>
          </div>
        </div>

        <div className="controls">
          <div className="week-nav">
            <button type="button" className="nav-btn nav-today" onClick={() => setWeekIndex(thisWeekIndex)}>
              This week
            </button>
            <button type="button" className="nav-btn" onClick={() => setWeekIndex((i) => Math.max(0, i - 1))} disabled={weekIndex === 0} aria-label="Previous week">
              &lsaquo;
            </button>
            <button type="button" className="nav-btn" onClick={() => setWeekIndex((i) => Math.min(lastWeek, i + 1))} disabled={weekIndex === lastWeek} aria-label="Next week">
              &rsaquo;
            </button>
          </div>

          <FilterBar meta={meta} activeGroup={activeGroup} onSelectGroup={setActiveGroup} />
        </div>
      </header>

      <WeekSection
        week={week}
        events={events}
        meta={meta}
        activeGroup={activeGroup}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelected}
        onEdit={(event) => setFormTarget(event)}
        onDelete={handleDelete}
        onAddOnDate={(date) => setFormTarget({ newOn: date })}
      />

      <footer className="note">Click a day&rsquo;s header to add an event on that date, or edit and remove events with the controls on each row &mdash; or ask the chat box (bottom right), which edits this calendar&rsquo;s data and can search the web first when you ask it to look something up.</footer>

      <ChatPanel
        onEventsChanged={setEvents}
        selectedEvents={selectedEvents}
        onClearSelection={clearSelected}
        reportError={reportError}
        clearError={clearError}
      />

      <BulkActionsBar
        selectedEvents={selectedEvents}
        onEventsChanged={setEvents}
        onClearSelection={clearSelected}
        reportError={reportError}
        clearError={clearError}
      />

      {formTarget !== null && (
        <EventForm
          meta={meta}
          event={addingOn !== null ? null : (formTarget as CalendarEvent)}
          defaultDate={addingOn ?? (week ? week[0] : toIsoDate(new Date()))}
          onSaved={(next) => {
            setEvents(next);
            setFormTarget(null);
          }}
          onCancel={() => setFormTarget(null)}
          reportError={reportError}
          clearError={clearError}
        />
      )}
    </div>
  );
}

/** Full-page fallback when the initial server-side data load fails. */
export function LoadErrorScreen({ message }: { message: string }) {
  const router = useRouter();
  const offline = useOffline();
  const [error, setError] = useState<string | null>(message);
  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <h1>Bootsing</h1>
          <div className="topbar-actions">
            <StatusIndicator error={error} offline={offline} onDismiss={() => setError(null)} />
            <Link href="/configuration" className="settings-btn" aria-label="Open configuration" title="Configuration">
              <span className="material-symbols-outlined" aria-hidden="true">
                settings
              </span>
            </Link>
          </div>
        </div>
      </header>
      <div className="load-error">
        <p className="load-error-title">We couldn&rsquo;t load your calendar.</p>
        <p className="load-error-note">Open the status icon above for details, then try again.</p>
        <button type="button" className="nav-btn" onClick={() => router.refresh()}>
          Try again
        </button>
      </div>
    </div>
  );
}

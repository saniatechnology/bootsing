"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusIndicator } from "./StatusIndicator";
import { HourlyWeekSection } from "./HourlyWeekSection";
import { EventList } from "./EventList";
import { EventForm } from "./EventForm";
import { HomeBulkBar } from "./HomeBulkBar";
import { StatusControls } from "./StatusControls";
import { useOffline } from "@/hooks/useOffline";
import { toIsoDate } from "@/lib/dates";
import { STATUS_META } from "@/lib/status-meta";
import { browseHorizon, latestStart, weekForIndex, weekIndexForDate } from "@/lib/weeks";
import { EVENT_STATUS_KEYS } from "@/lib/types";
import type { CalendarEvent, CalendarMeta, EventStatus } from "@/lib/types";

interface HomeAppProps {
  initialEvents: CalendarEvent[];
  meta: CalendarMeta;
  initialWeekIndex: number;
}

export function HomeApp({ initialEvents, meta, initialWeekIndex }: HomeAppProps) {
  const [events, setEvents] = useState(initialEvents);
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const thisWeekIndex = weekIndexForDate(meta.weeks, toIsoDate(new Date()));
  const [weekIndex, setWeekIndex] = useState(initialWeekIndex);

  const [connError, setConnError] = useState<string | null>(null);
  const offline = useOffline();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // null = closed; a CalendarEvent = editing it.
  const [formTarget, setFormTarget] = useState<CalendarEvent | null>(null);

  const week = weekForIndex(meta.weeks, weekIndex);

  const saved = events.filter((e) => e.status !== null);
  const counts = EVENT_STATUS_KEYS.reduce(
    (acc, s) => ({ ...acc, [s]: saved.filter((e) => e.status === s).length }),
    {} as Record<EventStatus, number>
  );

  const visible = statusFilter === "all" ? saved : saved.filter((e) => e.status === statusFilter);
  const selectedEvents = visible.filter((e) => selectedIds.has(e.id));

  // Let the user browse a couple of months past the last saved event.
  const maxWeekIndex = browseHorizon(meta.weeks, latestStart(saved), thisWeekIndex);

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

  async function handleSetStatus(id: number, status: EventStatus | null) {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't update this event");
      setEvents(data.events as CalendarEvent[]);
      setConnError(null);
    } catch (err) {
      setConnError(err instanceof Error ? err.message : "network error");
    }
  }

  // Clicking an event in the week view opens its detail bar there.

  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <div className="topbar-title">
            <h1>
              <Link href={`/?w=${weekIndex}`} className="title-link">
                Bootsing
              </Link>
            </h1>
            <Link href={`/explore?w=${weekIndex}`} className="area-link">
              Explore
            </Link>
          </div>
          <div className="topbar-actions">
            <StatusIndicator
              error={connError}
              offline={offline}
              onDismiss={() => setConnError(null)}
            />
            <Link
              href="/configuration"
              className="settings-btn"
              aria-label="Open configuration"
              title="Configuration"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                settings
              </span>
            </Link>
          </div>
        </div>

        <div className="controls">
          <div className="week-nav">
            <button
              type="button"
              className="nav-btn nav-today"
              onClick={() => setWeekIndex(thisWeekIndex)}
            >
              This week
            </button>
            <button
              type="button"
              className="nav-btn"
              onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
              disabled={weekIndex === 0}
              aria-label="Previous week"
            >
              &lsaquo;
            </button>
            <button
              type="button"
              className="nav-btn"
              onClick={() => setWeekIndex((i) => Math.min(maxWeekIndex, i + 1))}
              disabled={weekIndex >= maxWeekIndex}
              aria-label="Next week"
            >
              &rsaquo;
            </button>
          </div>

          <div className="status-filter" role="tablist" aria-label="Filter by status">
            <button
              type="button"
              className={`filter-chip${statusFilter === "all" ? " is-active" : ""}`}
              aria-pressed={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              All <span className="filter-count">{saved.length}</span>
            </button>
            {EVENT_STATUS_KEYS.map((s) => (
              <button
                key={s}
                type="button"
                className={`filter-chip status-${s}${statusFilter === s ? " is-active" : ""}`}
                aria-pressed={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                <span className="filter-chip-emoji" aria-hidden="true">
                  {STATUS_META[s].emoji}
                </span>
                {STATUS_META[s].label} <span className="filter-count">{counts[s]}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {saved.length === 0 ? (
        <section className="home-empty">
          <p>No saved events yet.</p>
          <p>
            Head to{" "}
            <Link href="/explore" className="home-empty-link">
              Explore
            </Link>{" "}
            and star the ones that catch your eye.
          </p>
        </section>
      ) : (
        week && (
          <>
            <HourlyWeekSection
              week={week}
              events={visible}
              meta={meta}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              onEdit={(event) => setFormTarget(event)}
              onSetStatus={handleSetStatus}
            />
            <EventList
              week={week}
              events={visible}
              meta={meta}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              onEdit={(event) => setFormTarget(event)}
              expandedId={expandedId}
              onExpandedChange={setExpandedId}
              statusBadge
              firstColLabel="Hype"
              renderActions={(event) => (
                <StatusControls event={event} onSetStatus={handleSetStatus} />
              )}
            />
          </>
        )
      )}

      <HomeBulkBar
        selectedEvents={selectedEvents}
        onEventsChanged={setEvents}
        onClearSelection={clearSelected}
        reportError={(m) => setConnError(m)}
        clearError={() => setConnError(null)}
      />

      {formTarget !== null && (
        <EventForm
          meta={meta}
          event={formTarget}
          defaultDate={week ? week[0] : toIsoDate(new Date())}
          onSaved={(next) => {
            setEvents(next);
            setFormTarget(null);
          }}
          onCancel={() => setFormTarget(null)}
          reportError={(m) => setConnError(m)}
          clearError={() => setConnError(null)}
        />
      )}
    </div>
  );
}

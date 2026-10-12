"use client";

import Link from "next/link";
import { useState } from "react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useSelection } from "@/hooks/useSelection";
import { useWeekNavigation } from "@/hooks/useWeekNavigation";
import { api, errorMessage } from "@/lib/api";
import { EVENT_STATUS_KEYS } from "@/lib/types";
import type { CalendarEvent, CalendarMeta, EventStatus } from "@/lib/types";
import { browseHorizon, latestStart } from "@/lib/weeks";
import { EventForm } from "../shared/EventForm";
import type { EventFormTarget } from "../shared/EventForm";
import { EventList } from "../shared/EventList";
import { StatusIndicator } from "../shared/StatusIndicator";
import { TopBar } from "../shared/TopBar";
import { WeekNav } from "../shared/WeekNav";
import { HomeBulkBar } from "./HomeBulkBar";
import { HourlyWeekSection } from "./HourlyWeekSection";
import { StatusControls } from "./StatusControls";
import { StatusFilter } from "./StatusFilter";

interface HomeAppProps {
  initialEvents: CalendarEvent[];
  meta: CalendarMeta;
  initialWeekIndex: number;
}

/**
 * The Home page: the events the user has saved from Explore, triaged as
 * Boots / Maybe / Interesting, in an hourly week view plus a list.
 */
export function HomeApp({ initialEvents, meta, initialWeekIndex }: HomeAppProps) {
  const [events, setEvents] = useState(initialEvents);
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [formTarget, setFormTarget] = useState<EventFormTarget | null>(null);

  const connection = useConnectionStatus();
  const { reportError, clearError } = connection;
  const selection = useSelection();

  const saved = events.filter((e) => e.status !== null);
  const counts = Object.fromEntries(
    EVENT_STATUS_KEYS.map((s) => [s, saved.filter((e) => e.status === s).length])
  ) as Record<EventStatus, number>;
  const visible = statusFilter === "all" ? saved : saved.filter((e) => e.status === statusFilter);
  const selectedEvents = visible.filter((e) => selection.selectedIds.has(e.id));

  // Let the user browse a couple of months past the last saved event.
  const nav = useWeekNavigation(meta.weeks, initialWeekIndex, (thisWeekIndex) =>
    browseHorizon(meta.weeks, latestStart(saved), thisWeekIndex)
  );
  const { week } = nav;

  async function handleSetStatus(id: number, status: EventStatus | null) {
    try {
      setEvents(await api.updateEvent(id, { status }));
      clearError();
    } catch (err) {
      reportError(errorMessage(err, "Couldn't update this event."));
    }
  }

  return (
    <div className="wrap">
      <header className="page">
        <TopBar
          weekIndex={nav.weekIndex}
          status={
            <StatusIndicator
              error={connection.error}
              offline={connection.offline}
              onDismiss={clearError}
            />
          }
        />

        <div className="controls">
          <WeekNav nav={nav} />
          <StatusFilter
            value={statusFilter}
            counts={counts}
            total={saved.length}
            onChange={setStatusFilter}
          />
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
              selectedIds={selection.selectedIds}
              onToggleSelect={selection.toggle}
              onEdit={(event) => setFormTarget({ kind: "edit", event })}
              onSetStatus={handleSetStatus}
            />
            <EventList
              week={week}
              events={visible}
              meta={meta}
              selectedIds={selection.selectedIds}
              onToggleSelect={selection.toggle}
              onEdit={(event) => setFormTarget({ kind: "edit", event })}
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
        onClearSelection={selection.clear}
        reportError={reportError}
        clearError={clearError}
      />

      {formTarget && (
        <EventForm
          meta={meta}
          target={formTarget}
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

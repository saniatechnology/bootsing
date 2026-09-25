"use client";

import { useState } from "react";
import { dayOfWeekAbbr, parseIsoDate } from "@/lib/dates";
import { primaryGroupColor } from "@/lib/event-meta";
import { buildHourlyWeekLayout } from "@/lib/hourly";
import { activateOnKey } from "@/lib/keyboard";
import type { CalendarEvent, CalendarMeta, EventStatus } from "@/lib/types";
import type { WeekRange } from "@/lib/weeks";
import { EventBarBody } from "../shared/EventBarBody";
import { DayScroller } from "../shared/DayScroller";
import { EventDetail } from "../shared/EventDetail";
import { StatusControls } from "./StatusControls";

/** Pixel height of one hour row on the time axis. */
const HOUR_H = 56;

function fmtBlockTime(startMin: number, endMin: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
}

interface HourlyWeekSectionProps {
  week: WeekRange;
  events: CalendarEvent[];
  meta: CalendarMeta;
  selectedIds: ReadonlySet<number>;
  onToggleSelect: (id: number) => void;
  onEdit: (event: CalendarEvent) => void;
  onSetStatus: (id: number, status: EventStatus | null) => void;
}

/**
 * The Home page's hourly week grid. Timed single-day events sit on a vertical
 * time axis (packed side-by-side when they overlap); untimed or multi-day
 * events float in an "all-day" band above it. Clicking a block opens its
 * detail panel below the grid.
 */
export function HourlyWeekSection({
  week,
  events,
  meta,
  selectedIds,
  onToggleSelect,
  onEdit,
  onSetStatus,
}: HourlyWeekSectionProps) {
  const layout = buildHourlyWeekLayout(events, week);
  const bodyHeight = ((layout.axisEndMin - layout.axisStartMin) / 60) * HOUR_H;
  const gridCols = `repeat(${layout.dayCount}, var(--col-w, 1fr))`;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandedEvent = events.find((e) => e.id === expandedId) ?? null;
  // 1-based position used only as the badge fallback when an event is untagged.
  const orderIndex = new Map(events.map((e, i) => [e.id, i + 1]));

  const toggleExpanded = (id: number) => setExpandedId((prev) => (prev === id ? null : id));
  const colorOf = (event: CalendarEvent) => primaryGroupColor(meta, event);

  return (
    <section className="hourly">
      <DayScroller dayCount={layout.dayCount}>
        <div className="hourly-head" style={{ gridTemplateColumns: gridCols }}>
          {layout.days.map((day) => (
            <div className="hourly-dayhead" key={day.toISOString()}>
              <span className="hourly-dow">{dayOfWeekAbbr(day)}</span>
              <span className="hourly-dnum">{day.getUTCDate()}</span>
            </div>
          ))}
        </div>

        {layout.untimed.length > 0 && (
          <div className="hourly-band" style={{ gridTemplateColumns: gridCols }}>
            {layout.untimed.map((u) => {
              const ev = u.event;
              const selected = selectedIds.has(ev.id);
              const expanded = expandedId === ev.id;
              return (
                <div
                  key={ev.id}
                  className={`hourly-item ev-selectable${selected ? " selected" : ""}${expanded ? " expanded" : ""}`}
                  style={{
                    gridColumn: `${u.colStart} / span ${u.span}`,
                    ["--cat" as string]: colorOf(ev),
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  title={`${ev.name} — ${ev.venue}`}
                  onClick={() => toggleExpanded(ev.id)}
                  onKeyDown={activateOnKey(() => toggleExpanded(ev.id))}
                >
                  <EventBarBody
                    event={ev}
                    index={orderIndex.get(ev.id) ?? 0}
                    selected={selected}
                    onToggleSelect={() => onToggleSelect(ev.id)}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="hourly-body">
          <div
            className="hourly-cols"
            style={{ gridTemplateColumns: gridCols, height: bodyHeight }}
          >
            {layout.days.map((day, dayIndex) => (
              <div
                className="hourly-col"
                key={day.toISOString()}
                style={{ backgroundSize: `100% ${HOUR_H}px` }}
              >
                {layout.timed
                  .filter((t) => t.dayIndex === dayIndex)
                  .map((t) => {
                    const ev = t.event;
                    const top = ((t.startMin - layout.axisStartMin) / 60) * HOUR_H;
                    const height = ((t.endMin - t.startMin) / 60) * HOUR_H;
                    const selected = selectedIds.has(ev.id);
                    const expanded = expandedId === ev.id;
                    return (
                      <div
                        key={ev.id}
                        className={`hourly-block ev-selectable${selected ? " selected" : ""}${expanded ? " expanded" : ""}`}
                        style={{
                          top,
                          height: Math.max(height, 18),
                          width: "100%",
                          ["--cat" as string]: colorOf(ev),
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={expanded}
                        title={`${fmtBlockTime(t.startMin, t.endMin)} · ${ev.name} — ${ev.venue}`}
                        onClick={() => toggleExpanded(ev.id)}
                        onKeyDown={activateOnKey(() => toggleExpanded(ev.id))}
                      >
                        <EventBarBody
                          event={ev}
                          index={orderIndex.get(ev.id) ?? 0}
                          selected={selected}
                          onToggleSelect={() => onToggleSelect(ev.id)}
                          time={fmtBlockTime(t.startMin, t.endMin)}
                        />
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
          {!layout.hasTimed && layout.untimed.length === 0 && (
            <p className="hourly-empty">No events with known times this week.</p>
          )}
        </div>
      </DayScroller>

      {expandedEvent && (
        <div className="ev-detail hourly-detail">
          <EventDetail
            event={expandedEvent}
            meta={meta}
            range={[parseIsoDate(expandedEvent.start), parseIsoDate(expandedEvent.end)]}
            actions={
              <>
                <StatusControls event={expandedEvent} onSetStatus={onSetStatus} />
                <button
                  type="button"
                  className="ev-action-btn"
                  onClick={() => onEdit(expandedEvent)}
                >
                  Edit
                </button>
              </>
            }
          />
        </div>
      )}
    </section>
  );
}

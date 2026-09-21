"use client";

import { useState } from "react";
import { dayOfWeekAbbr, fmtDateRange, fmtTimeRange, parseIsoDate } from "@/lib/dates";
import { buildHourlyWeekLayout } from "@/lib/hourly";
import { SelectBadge } from "./EventList";
import { StatusControls, STATUS_META } from "./StatusControls";
import type { CalendarEvent, CalendarMeta, EventStatus, GroupKey, IsoDate } from "@/lib/types";

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

/**
 * The Home page's hourly week grid. Timed single-day events sit on a vertical
 * time axis (packed side-by-side when they overlap); untimed or multi-day
 * events float in an "all-day" band above it. Blocks are colour-coded by the
 * user's status; editing happens in the list below.
 */
export function HourlyWeekSection({
  week,
  events,
  meta,
  selectedIds,
  onToggleSelect,
  onEdit,
  onSetStatus,
}: {
  week: [IsoDate, IsoDate];
  events: CalendarEvent[];
  meta: CalendarMeta;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onEdit: (event: CalendarEvent) => void;
  onSetStatus: (id: number, status: EventStatus | null) => void;
}) {
  const layout = buildHourlyWeekLayout(events, week);
  const bodyHeight = ((layout.axisEndMin - layout.axisStartMin) / 60) * HOUR_H;
  const gridCols = `repeat(${layout.dayCount}, 1fr)`;

  const noTimed = layout.timed.length === 0;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandedEvent = events.find((e) => e.id === expandedId) ?? null;
  // 1-based position used only as the badge fallback when an event is untagged.
  const orderIndex = new Map(events.map((e, i) => [e.id, i + 1]));

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // The category colour used for an event's left border, matching Explore.
  function colorOf(event: CalendarEvent): string {
    const primary = (meta.catGroups[event.cat] ?? [])[0] as GroupKey | undefined;
    return primary ? meta.groupColors[primary] : "var(--text-muted)";
  }

  return (
    <section className="hourly">
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
          {layout.untimed.map((u) => (
            <button
              key={u.event.id}
              type="button"
              className={`hourly-item${expandedId === u.event.id ? " expanded" : ""}`}
              style={{
                gridColumn: `${u.colStart + 1} / span ${u.span}`,
                ["--cat" as string]: colorOf(u.event),
              }}
              title={`${u.event.name} — ${u.event.venue}`}
              onClick={() => toggleExpanded(u.event.id)}
            >
              {u.event.name}
            </button>
          ))}
        </div>
      )}

      <div className="hourly-body">
        {/* <div className="hourly-axis" style={{ height: bodyHeight }}>
          {layout.hours.slice(0, -1).map((m, i) => (
            <div className="hourly-hour" key={m} style={{ top: i * HOUR_H }}>
              {fmtHourLabel(m)}
            </div>
          ))}
        </div> */}
        <div
          className="hourly-cols"
          style={{ gridTemplateColumns: `repeat(${layout.dayCount}, 1fr)`, height: bodyHeight }}
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
                  const widthPct = 100 / t.laneCount;
                  const leftPct = t.lane * widthPct;
                  const selected = selectedIds.has(ev.id);
                  const expanded = expandedId === ev.id;
                  return (
                    <div
                      key={ev.id}
                      className={`hourly-block${selected ? " selected" : ""}${expanded ? " expanded" : ""}`}
                      style={{
                        top,
                        height: Math.max(height, 18),
                        left: `calc(${leftPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                        ["--cat" as string]: colorOf(ev),
                      }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      title={`${fmtBlockTime(t.startMin, t.endMin)} · ${ev.name} — ${ev.venue}`}
                      onClick={() => toggleExpanded(ev.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpanded(ev.id);
                        }
                      }}
                    >
                      <div className="ev-row-line1">
                        <SelectBadge
                          index={orderIndex.get(ev.id) ?? 0}
                          eventName={ev.name}
                          selected={selected}
                          onToggle={() => onToggleSelect(ev.id)}
                          numClassName="ev-badge"
                          statusEmoji={ev.status ? STATUS_META[ev.status].emoji : undefined}
                        />
                        <span className="ev-name">{ev.name}</span>
                        {ev.approx && <span className="approx">approx.</span>}
                      </div>
                      <div className="ev-row-line2">
                        <span className="ev-venue">{ev.venue}</span>
                        <span className="ev-time">{fmtBlockTime(t.startMin, t.endMin)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
        {noTimed && layout.untimed.length === 0 && (
          <p className="hourly-empty">No events with known times this week.</p>
        )}
      </div>

      {expandedEvent && (
        <div className="ev-detail hourly-detail">
          <div className="ev-detail-inner">
            <div className="ev-detail-head">
              <span className="catdot" style={{ background: colorOf(expandedEvent) }} />
              <span className="ev-detail-groups">
                {(meta.catGroups[expandedEvent.cat] ?? [])
                  .map((g) => meta.groupLabels[g])
                  .join(" · ")}
              </span>
              <span className="ev-detail-title">{expandedEvent.name}</span>
              {expandedEvent.approx && <span className="approx">approx.</span>}
            </div>
            <dl className="ev-detail-grid">
              <div>
                <dt>Venue</dt>
                <dd>{expandedEvent.venue}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd className="mono">
                  {fmtDateRange(parseIsoDate(expandedEvent.start), parseIsoDate(expandedEvent.end))}
                </dd>
              </div>
              {expandedEvent.startTime && (
                <div>
                  <dt>Time</dt>
                  <dd className="mono">
                    {fmtTimeRange(expandedEvent.startTime, expandedEvent.endTime)}
                  </dd>
                </div>
              )}
              <div>
                <dt>Cost</dt>
                <dd>{expandedEvent.cost}</dd>
              </div>
              <div className="ev-detail-desc">
                <dt>Description</dt>
                <dd>{expandedEvent.desc}</dd>
              </div>
            </dl>
            <a
              className="ev-detail-link"
              href={expandedEvent.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              More info &#8599;
            </a>
            <div className="ev-detail-actions">
              <StatusControls event={expandedEvent} onSetStatus={onSetStatus} />
              <button type="button" className="ev-action-btn" onClick={() => onEdit(expandedEvent)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

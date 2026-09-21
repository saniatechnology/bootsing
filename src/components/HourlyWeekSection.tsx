"use client";

import { dayOfWeekAbbr } from "@/lib/dates";
import { buildHourlyWeekLayout } from "@/lib/hourly";
import type { CalendarEvent, CalendarMeta, GroupKey, IsoDate } from "@/lib/types";

/** Pixel height of one hour row on the time axis. */
const HOUR_H = 56;

/** "20:00"-style label for a minute offset that may run past midnight. */
function fmtHourLabel(min: number): string {
  const hour = Math.floor(min / 60) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

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
  onSelect,
}: {
  week: [IsoDate, IsoDate];
  events: CalendarEvent[];
  meta: CalendarMeta;
  onSelect?: (event: CalendarEvent) => void;
}) {
  const layout = buildHourlyWeekLayout(events, week);
  const bodyHeight = ((layout.axisEndMin - layout.axisStartMin) / 60) * HOUR_H;
  const gridCols = `repeat(${layout.dayCount}, 1fr)`;

  const noTimed = layout.timed.length === 0;

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
              className="hourly-item"
              style={{ gridColumn: `${u.colStart + 1} / span ${u.span}`, ["--cat" as string]: colorOf(u.event) }}
              title={`${u.event.name} — ${u.event.venue}`}
              onClick={() => onSelect?.(u.event)}
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
                  const top = ((t.startMin - layout.axisStartMin) / 60) * HOUR_H;
                  const height = ((t.endMin - t.startMin) / 60) * HOUR_H;
                  const widthPct = 100 / t.laneCount;
                  const leftPct = t.lane * widthPct;
                  return (
                    <button
                      key={t.event.id}
                      type="button"
                      className="hourly-block"
                      style={{
                        top,
                        height: Math.max(height, 18),
                        left: `calc(${leftPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                        ["--cat" as string]: colorOf(t.event),
                      }}
                      title={`${fmtBlockTime(t.startMin, t.endMin)} · ${t.event.name} — ${t.event.venue}`}
                      onClick={() => onSelect?.(t.event)}
                    >
                      <span className="hourly-block-name">{t.event.name}</span>
                      <span className="hourly-block-meta">
                        <span className="hourly-block-venue">{t.event.venue}</span>
                        <span className="hourly-block-time">{fmtBlockTime(t.startMin, t.endMin)}</span>
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        {noTimed && layout.untimed.length === 0 && (
          <p className="hourly-empty">No events with known times this week.</p>
        )}
      </div>
    </section>
  );
}

"use client";

import { Fragment, useState } from "react";
import { dayOfWeekAbbr, fmtDateRange, toIsoDate } from "@/lib/dates";
import { buildWeekLayout } from "@/lib/grid";
import type { CalendarEvent, CalendarMeta, GroupKey, IsoDate } from "@/lib/types";

interface WeekSectionProps {
  week: [IsoDate, IsoDate];
  events: CalendarEvent[];
  meta: CalendarMeta;
  activeGroup: GroupKey | "all";
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onAddOnDate: (date: IsoDate) => void;
}

/**
 * The number badge that, on row hover or when the event is selected, becomes a
 * checkbox for manual selection. The checkbox overlays the number and toggles
 * visibility via CSS (see `.ev-select` in globals.css), so the number stays the
 * default resting state and selection persists across week navigation.
 */
function SelectBadge({
  index,
  eventName,
  selected,
  onToggle,
  numClassName,
}: {
  index: number;
  eventName: string;
  selected: boolean;
  onToggle: () => void;
  numClassName: string;
}) {
  return (
    <span className="ev-select" onClick={(e) => e.stopPropagation()}>
      <span className={numClassName} aria-hidden="true">
        {index}
      </span>
      <input
        type="checkbox"
        className="ev-select-box"
        checked={selected}
        onChange={onToggle}
        aria-label={`Select ${eventName}`}
      />
    </span>
  );
}

export function WeekSection({
  week,
  events,
  meta,
  activeGroup,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onAddOnDate,
}: WeekSectionProps) {
  const layout = buildWeekLayout(events, week);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function isHidden(event: CalendarEvent): boolean {
    if (activeGroup === "all") return false;
    return !meta.catGroups[event.cat]?.includes(activeGroup);
  }

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  /** An event's groups, and the color of its first (primary) group. */
  function groupsOf(event: CalendarEvent): GroupKey[] {
    return meta.catGroups[event.cat] ?? [];
  }
  function colorOf(event: CalendarEvent): string {
    const primary = groupsOf(event)[0];
    return primary ? meta.groupColors[primary] : "var(--text-muted)";
  }

  // The expanded event's detail row is injected as a full-width grid row right
  // below its lane; lanes beneath it shift down one row to make space.
  const expandedRow =
    expandedId != null
      ? layout.rows.find((r) => r.event.id === expandedId && !isHidden(r.event))
      : undefined;
  const expandedLane = expandedRow ? expandedRow.lane : -1;

  return (
    <section className="week">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${layout.dayCount}, 1fr)`,
          gridTemplateRows: `auto repeat(${layout.laneCount + (expandedRow ? 1 : 0)}, auto)`,
        }}
      >
        {layout.days.map((day) => {
          const iso = toIsoDate(day);
          return (
            <div
              className="daycell head"
              key={day.toISOString()}
              style={{ gridRow: 1 }}
              role="button"
              tabIndex={0}
              aria-label={`Add event on ${iso}`}
              title="Add an event on this day"
              onClick={() => onAddOnDate(iso)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onAddOnDate(iso);
                }
              }}
            >
              <span className="dow">{dayOfWeekAbbr(day)}</span>
              <span className="dnum">{day.getUTCDate()}</span>
              <span className="day-add" aria-hidden="true">
                +
              </span>
            </div>
          );
        })}

        {layout.rows.map((row) => {
          const { event, index, colStart, span, lane, clippedStart, clippedEnd } = row;
          const selected = selectedIds.has(event.id);
          const hidden = isHidden(event);
          const expanded = expandedRow?.event.id === event.id;
          const gridRow = lane + 2 + (expandedLane >= 0 && lane > expandedLane ? 1 : 0);
          return (
            <Fragment key={event.id}>
              <div
                className={`ev-row${selected ? " selected" : ""}${expanded ? " expanded" : ""}`}
                style={{
                  gridRow,
                  gridColumn: `${colStart} / span ${span}`,
                  ["--cat" as string]: colorOf(event),
                  display: hidden ? "none" : undefined,
                }}
                role="button"
                tabIndex={hidden ? -1 : 0}
                aria-expanded={expanded}
                onClick={() => toggleExpanded(event.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpanded(event.id);
                  }
                }}
              >
                <SelectBadge
                  index={index}
                  eventName={event.name}
                  selected={selected}
                  onToggle={() => onToggleSelect(event.id)}
                  numClassName="ev-badge"
                />
                <span className="ev-name">{event.name}</span>
                {/* <span className="ev-venue">{event.venue}</span> */}
                {event.approx && <span className="approx">approx.</span>}
              </div>

              {expanded && (
                <div className="ev-detail" style={{ gridRow: expandedLane + 3, gridColumn: "1 / -1" }}>
                  <div className="ev-detail-inner">
                    <div className="ev-detail-head">
                      <span className="catdot" style={{ background: colorOf(event) }} />
                      <span className="ev-detail-groups">
                        {groupsOf(event).map((g) => meta.groupLabels[g]).join(" · ")}
                      </span>
                      <span className="ev-detail-title">{event.name}</span>
                      {event.approx && <span className="approx">approx.</span>}
                    </div>
                    <dl className="ev-detail-grid">
                      <div>
                        <dt>Venue</dt>
                        <dd>{event.venue}</dd>
                      </div>
                      <div>
                        <dt>Date</dt>
                        <dd className="mono">{fmtDateRange(clippedStart, clippedEnd)}</dd>
                      </div>
                      <div>
                        <dt>Cost</dt>
                        <dd>{event.cost}</dd>
                      </div>
                      <div className="ev-detail-desc">
                        <dt>Description</dt>
                        <dd>{event.desc}</dd>
                      </div>
                    </dl>
                    <a
                      className="ev-detail-link"
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      More info &#8599;
                    </a>
                    <div className="ev-detail-actions">
                      <button
                        type="button"
                        className="ev-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(event);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ev-action-btn ev-action-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(event);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      <div className="detail-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Group</th>
              <th>Event</th>
              <th>Venue</th>
              <th>Date</th>
              <th>Cost</th>
              <th>Description</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {layout.rows.map((row) => {
              const { event, index, clippedStart, clippedEnd } = row;
              const selected = selectedIds.has(event.id);
              return (
                <tr
                  key={event.id}
                  className={`ev-list-row${selected ? " selected" : ""}`}
                  style={{ display: isHidden(event) ? "none" : undefined }}
                  role="button"
                  tabIndex={isHidden(event) ? -1 : 0}
                  aria-label={`Edit ${event.name}`}
                  onClick={() => onEdit(event)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEdit(event);
                    }
                  }}
                >
                  <td className="dnum-cell">
                    <SelectBadge
                      index={index}
                      eventName={event.name}
                      selected={selected}
                      onToggle={() => onToggleSelect(event.id)}
                      numClassName="dnum-num"
                    />
                  </td>
                  <td>
                    <span className="catdot" style={{ background: colorOf(event) }} />
                    {groupsOf(event).map((g) => meta.groupLabels[g]).join(" · ")}
                  </td>
                  <td className="evn">
                    {event.name}
                    {event.approx && <span className="approx"> approx.</span>}
                  </td>
                  <td>{event.venue}</td>
                  <td className="mono">{fmtDateRange(clippedStart, clippedEnd)}</td>
                  <td>{event.cost}</td>
                  <td>{event.desc}</td>
                  <td>
                    <a href={event.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      More info &#8599;
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

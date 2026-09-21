"use client";

import { Fragment, useState, type ReactNode } from "react";
import { dayOfWeekAbbr, fmtDateRange, fmtTimeRange, toIsoDate } from "@/lib/dates";
import { groupLabelsOf, matchesGroup, primaryGroupColor } from "@/lib/event-meta";
import { buildWeekLayout } from "@/lib/grid";
import { STATUS_META } from "@/lib/status-meta";
import { EventList, SelectBadge } from "./EventList";
import type { CalendarEvent, CalendarMeta, GroupKey, IsoDate } from "@/lib/types";

interface WeekSectionProps {
  week: [IsoDate, IsoDate];
  events: CalendarEvent[];
  meta: CalendarMeta;
  activeGroup: GroupKey | "all";
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectDay: (ids: number[]) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onToggleInteresting: (event: CalendarEvent) => void;
  onAddOnDate: (date: IsoDate) => void;
  emptyContent?: ReactNode;
}

export function WeekSection({
  week,
  events,
  meta,
  activeGroup,
  selectedIds,
  onToggleSelect,
  onSelectDay,
  onEdit,
  onDelete,
  onToggleInteresting,
  onAddOnDate,
  emptyContent,
}: WeekSectionProps) {
  const layout = buildWeekLayout(events, week);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const isHidden = (event: CalendarEvent) => !matchesGroup(meta, event, activeGroup);
  const colorOf = (event: CalendarEvent) => primaryGroupColor(meta, event);

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // The expanded event's detail row is injected as a full-width grid row right
  // below its lane; lanes beneath it shift down one row to make space.
  const expandedRow =
    expandedId != null
      ? layout.rows.find((r) => r.event.id === expandedId && !isHidden(r.event))
      : undefined;
  const expandedLane = expandedRow ? expandedRow.lane : -1;

  const visibleRowCount = layout.rows.filter((r) => !isHidden(r.event)).length;

  return (
    <section>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${layout.dayCount}, 1fr)`,
          gridTemplateRows: `auto repeat(${layout.laneCount + (expandedRow ? 1 : 0)}, auto)`,
        }}
      >
        {layout.days.map((day) => {
          const iso = toIsoDate(day);
          // Single-day, visible events on this date; multi-day events are left untouched.
          const dayEventIds = events
            .filter((e) => e.start === iso && e.end === iso && !isHidden(e))
            .map((e) => e.id);
          const hasEvents = dayEventIds.length > 0;
          return (
            <div
              className="daycell head"
              key={day.toISOString()}
              style={{ gridRow: 1 }}
              role="button"
              tabIndex={0}
              aria-label={`Select all events on ${iso}`}
              title="Select all events on this day"
              onClick={() => hasEvents && onSelectDay(dayEventIds)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (hasEvents) onSelectDay(dayEventIds);
                }
              }}
            >
              <span className="dow">{dayOfWeekAbbr(day)}</span>
              <span className="dnum">{day.getUTCDate()}</span>
              <button
                type="button"
                className="day-add"
                aria-label={`Add event on ${iso}`}
                title="Add an event on this day"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddOnDate(iso);
                }}
              >
                +
              </button>
            </div>
          );
        })}

        {visibleRowCount === 0 && emptyContent && (
          <div className="week-empty-cell" style={{ gridColumn: "1 / -1" }}>
            {emptyContent}
          </div>
        )}

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
                <div className="ev-row-line1">
                  <SelectBadge
                    index={index}
                    eventName={event.name}
                    selected={selected}
                    onToggle={() => onToggleSelect(event.id)}
                    numClassName="ev-badge"
                    statusEmoji={event.status ? STATUS_META[event.status].emoji : undefined}
                  />
                  <span className="ev-name">{event.name}</span>
                  {event.approx && <span className="approx">approx.</span>}
                </div>
                <div className="ev-row-line2">
                  <span className="ev-venue">{event.venue}</span>
                  {event.startTime && <span className="ev-time">{event.startTime}</span>}
                </div>
              </div>

              {expanded && (
                <div
                  className="ev-detail"
                  style={{ gridRow: expandedLane + 3, gridColumn: "1 / -1" }}
                >
                  <div className="ev-detail-inner">
                    <div className="ev-detail-head">
                      <span className="catdot" style={{ background: colorOf(event) }} />
                      <span className="ev-detail-groups">{groupLabelsOf(meta, event)}</span>
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
                      {event.startTime && (
                        <div>
                          <dt>Time</dt>
                          <dd className="mono">{fmtTimeRange(event.startTime, event.endTime)}</dd>
                        </div>
                      )}
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
                        className={`ev-action-btn ev-action-star${event.status ? " is-saved" : ""}`}
                        aria-pressed={event.status !== null}
                        title={
                          event.status ? "Saved to Home — click to remove" : "Mark as interesting"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleInteresting(event);
                        }}
                      >
                        <span className="ev-action-emoji" aria-hidden="true">
                          👀
                        </span>
                        {event.status ? "Saved" : "Interesting"}
                      </button>
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

      <EventList
        week={week}
        events={events}
        meta={meta}
        activeGroup={activeGroup}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onEdit={onEdit}
        renderActions={(event) => (
          <>
            <button
              type="button"
              className={`ev-action-btn ev-action-star${event.status ? " is-saved" : ""}`}
              aria-pressed={event.status !== null}
              title={event.status ? "Saved to Home — click to remove" : "Mark as interesting"}
              onClick={() => onToggleInteresting(event)}
            >
              <span className="ev-action-emoji" aria-hidden="true">
                👀
              </span>
              {event.status ? "Saved" : "Interesting"}
            </button>
            <button
              type="button"
              className="ev-action-btn ev-action-delete"
              onClick={() => onDelete(event)}
            >
              Delete
            </button>
          </>
        )}
      />
    </section>
  );
}

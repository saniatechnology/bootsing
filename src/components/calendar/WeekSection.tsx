"use client";

import { Fragment, useState } from "react";
import { dayOfWeekAbbr, toIsoDate } from "@/lib/dates";
import { matchesGroup, primaryGroupColor } from "@/lib/event-meta";
import { buildWeekLayout } from "@/lib/grid";
import { activateOnKey } from "@/lib/keyboard";
import type { CalendarEvent, CalendarMeta, GroupKey, IsoDate } from "@/lib/types";
import type { WeekRange } from "@/lib/weeks";
import { EventBarBody } from "../shared/EventBarBody";
import { DayScroller } from "../shared/DayScroller";
import { EventDetail } from "../shared/EventDetail";
import { EventList } from "../shared/EventList";
import { InterestingButton } from "../shared/InterestingButton";

interface WeekSectionProps {
  week: WeekRange;
  events: CalendarEvent[];
  meta: CalendarMeta;
  activeGroup: GroupKey | "all";
  selectedIds: ReadonlySet<number>;
  onToggleSelect: (id: number) => void;
  /** Toggle every listed event's selection together (a day header click). */
  onSelectDay: (ids: number[]) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onToggleInteresting: (event: CalendarEvent) => void;
  onAddOnDate: (date: IsoDate) => void;
}

/**
 * Explore's week: the spreadsheet-style grid of event bars (one lane per
 * overlapping event, short events floating to the top) with a click-to-expand
 * detail row, followed by the shared event table. Filtered-out events keep
 * their lane so the layout doesn't jump when the filter changes.
 */
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
}: WeekSectionProps) {
  const layout = buildWeekLayout(events, week);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const isHidden = (event: CalendarEvent) => !matchesGroup(meta, event, activeGroup);
  const toggleExpanded = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  // The expanded event's detail row is injected as a full-width grid row right
  // below its lane; lanes beneath it shift down one row to make space.
  const expandedRow =
    expandedId != null
      ? layout.rows.find((r) => r.event.id === expandedId && !isHidden(r.event))
      : undefined;
  const expandedLane = expandedRow ? expandedRow.lane : -1;

  const actionsFor = (event: CalendarEvent) => (
    <>
      <InterestingButton event={event} onToggle={onToggleInteresting} />
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
    </>
  );

  return (
    <section>
      <DayScroller dayCount={layout.dayCount}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${layout.dayCount}, var(--col-w, 1fr))`,
            gridTemplateRows: `auto repeat(${layout.laneCount + (expandedRow ? 1 : 0)}, auto)`,
          }}
        >
          {layout.days.map((day) => {
            const iso = toIsoDate(day);
            // Single-day, visible events on this date; multi-day events are left untouched.
            const dayEventIds = events
              .filter((e) => e.start === iso && e.end === iso && !isHidden(e))
              .map((e) => e.id);
            const selectDay = () => {
              if (dayEventIds.length > 0) onSelectDay(dayEventIds);
            };
            return (
              <div
                className="daycell head"
                key={iso}
                style={{ gridRow: 1 }}
                role="button"
                tabIndex={0}
                aria-label={`Select all events on ${iso}`}
                title="Select all events on this day"
                onClick={selectDay}
                onKeyDown={activateOnKey(selectDay)}
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

          {layout.rows.map(({ event, index, colStart, span, lane, clippedStart, clippedEnd }) => {
            const selected = selectedIds.has(event.id);
            const hidden = isHidden(event);
            const expanded = expandedRow?.event.id === event.id;
            const gridRow = lane + 2 + (expandedLane >= 0 && lane > expandedLane ? 1 : 0);
            return (
              <Fragment key={event.id}>
                <div
                  className={`ev-row ev-selectable${selected ? " selected" : ""}${expanded ? " expanded" : ""}`}
                  style={{
                    gridRow,
                    gridColumn: `${colStart} / span ${span}`,
                    ["--cat" as string]: primaryGroupColor(meta, event),
                    display: hidden ? "none" : undefined,
                  }}
                  role="button"
                  tabIndex={hidden ? -1 : 0}
                  aria-expanded={expanded}
                  onClick={() => toggleExpanded(event.id)}
                  onKeyDown={activateOnKey(() => toggleExpanded(event.id))}
                >
                  <EventBarBody
                    event={event}
                    index={index}
                    selected={selected}
                    onToggleSelect={() => onToggleSelect(event.id)}
                    time={event.startTime ?? undefined}
                  />
                </div>

                {expanded && (
                  <div
                    className="ev-detail"
                    style={{ gridRow: expandedLane + 3, gridColumn: "1 / -1" }}
                  >
                    <EventDetail
                      event={event}
                      meta={meta}
                      range={[clippedStart, clippedEnd]}
                      actions={actionsFor(event)}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </DayScroller>

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
            <InterestingButton event={event} onToggle={onToggleInteresting} />
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

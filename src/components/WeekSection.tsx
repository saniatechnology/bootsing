import { dayOfWeekAbbr, fmtDateRange } from "@/lib/dates";
import { buildWeekLayout } from "@/lib/grid";
import type { CalendarEvent, CalendarMeta, GroupKey, IsoDate } from "@/lib/types";

interface WeekSectionProps {
  week: [IsoDate, IsoDate];
  events: CalendarEvent[];
  meta: CalendarMeta;
  activeGroup: GroupKey | "all";
}

export function WeekSection({ week, events, meta, activeGroup }: WeekSectionProps) {
  const layout = buildWeekLayout(events, week);

  function isHidden(event: CalendarEvent): boolean {
    if (activeGroup === "all") return false;
    return !meta.catGroups[event.cat]?.includes(activeGroup);
  }

  /** An event's groups, and the color of its first (primary) group. */
  function groupsOf(event: CalendarEvent): GroupKey[] {
    return meta.catGroups[event.cat] ?? [];
  }
  function colorOf(event: CalendarEvent): string {
    const primary = groupsOf(event)[0];
    return primary ? meta.groupColors[primary] : "var(--text-muted)";
  }

  return (
    <section className="week">
      <h2 className="week-title">
        <span className="week-range">{fmtDateRange(layout.weekStart, layout.weekEnd)}</span>
      </h2>

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${layout.dayCount}, 1fr)`,
          gridTemplateRows: `auto repeat(${layout.laneCount}, auto)`,
        }}
      >
        {layout.days.map((day) => (
          <div className="daycell head" key={day.toISOString()} style={{ gridRow: 1 }}>
            <span className="dow">{dayOfWeekAbbr(day)}</span>
            <span className="dnum">{day.getUTCDate()}</span>
          </div>
        ))}

        {layout.rows.map((row) => {
          const { event, index, colStart, span, lane } = row;
          return (
            <div
              key={event.id}
              className="ev-row"
              style={{
                gridRow: lane + 2,
                gridColumn: `${colStart} / span ${span}`,
                ["--cat" as string]: colorOf(event),
                display: isHidden(event) ? "none" : undefined,
              }}
            >
              <span className="ev-badge">{index}</span>
              <span className="ev-name">{event.name}</span>
              <span className="ev-venue">{event.venue}</span>
              {event.approx && <span className="approx">approx.</span>}
            </div>
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
              return (
                <tr key={event.id} style={{ display: isHidden(event) ? "none" : undefined }}>
                  <td className="dnum-cell">{index}</td>
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
                    <a href={event.link} target="_blank" rel="noopener noreferrer">
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

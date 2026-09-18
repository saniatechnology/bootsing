import { dayOfWeekAbbr, fmtDateRange } from "@/lib/dates";
import { buildWeekLayout } from "@/lib/grid";
import type { CalendarEvent, CalendarMeta, CategoryKey, GenreKey, IsoDate } from "@/lib/types";

const FLAG_ICON: Record<string, string> = { closing: "\u{1F534}", rare: "⭐", finale: "\u{1F389}" };
const FLAG_LABEL: Record<string, string> = {
  closing: "Last chance",
  rare: "One-off / rare",
  finale: "Season finale",
};

interface WeekSectionProps {
  weekNumber: number;
  week: [IsoDate, IsoDate];
  events: CalendarEvent[];
  meta: CalendarMeta;
  hiddenCats: ReadonlySet<CategoryKey>;
  hiddenGenres: ReadonlySet<GenreKey>;
}

export function WeekSection({ weekNumber, week, events, meta, hiddenCats, hiddenGenres }: WeekSectionProps) {
  const layout = buildWeekLayout(events, week);

  function isHidden(event: CalendarEvent): boolean {
    if (hiddenCats.has(event.cat)) return true;
    if (event.genre && hiddenGenres.has(event.genre)) return true;
    return false;
  }

  return (
    <section className="week">
      <h2 className="week-title">
        Week {weekNumber} <span className="week-range">{fmtDateRange(layout.weekStart, layout.weekEnd)}</span>
      </h2>

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${layout.dayCount}, 1fr)`,
          gridTemplateRows: `auto repeat(${layout.rows.length}, auto)`,
        }}
      >
        {layout.days.map((day) => (
          <div className="daycell head" key={day.toISOString()} style={{ gridRow: 1 }}>
            <span className="dow">{dayOfWeekAbbr(day)}</span>
            <span className="dnum">{day.getUTCDate()}</span>
          </div>
        ))}

        {layout.rows.map((row) => {
          const { event, index, colStart, span } = row;
          const catMeta = meta.cats[event.cat];
          return (
            <div
              key={event.id}
              className="ev-row"
              style={{
                gridRow: index + 1,
                gridColumn: `${colStart} / span ${span}`,
                ["--cat" as string]: catMeta.color,
                display: isHidden(event) ? "none" : undefined,
              }}
            >
              <span className="ev-badge">{index}</span>
              <span className="ev-name">{event.name}</span>
              <span className="ev-venue">{event.venue}</span>
              {event.flags.map((flag) => (
                <span className="flagchip" title={FLAG_LABEL[flag]} key={flag}>
                  {FLAG_ICON[flag]}
                </span>
              ))}
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
              <th>Category</th>
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
              const catMeta = meta.cats[event.cat];
              return (
                <tr key={event.id} style={{ display: isHidden(event) ? "none" : undefined }}>
                  <td className="dnum-cell">{index}</td>
                  <td>
                    <span className="catdot" style={{ background: catMeta.color }} />
                    {catMeta.label}
                    {event.genre && <span className="genrechip">{meta.genreLabels[event.genre]}</span>}
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

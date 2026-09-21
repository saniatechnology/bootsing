import { HomeApp } from "@/components/HomeApp";
import { LoadErrorScreen } from "@/components/CalendarApp";
import { readEvents, readMeta } from "@/lib/store";
import { configuredWeekIndexForDate } from "@/lib/weeks";
import { toIsoDate } from "@/lib/dates";

// Always read the current file on the server at request time — this is a
// living, chat-editable dataset, not something to statically freeze at build time.
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  let events: Awaited<ReturnType<typeof readEvents>>;
  let meta: Awaited<ReturnType<typeof readMeta>>;
  try {
    [events, meta] = await Promise.all([readEvents(), readMeta()]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load your calendar.";
    return <LoadErrorScreen message={message} />;
  }
  const w = Number((await searchParams).w);
  const initialWeekIndex =
    Number.isInteger(w) && w >= 0
      ? w
      : configuredWeekIndexForDate(meta.weeks, toIsoDate(new Date()));
  return <HomeApp initialEvents={events} meta={meta} initialWeekIndex={initialWeekIndex} />;
}

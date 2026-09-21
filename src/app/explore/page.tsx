import type { Metadata } from "next";
import { CalendarApp, LoadErrorScreen } from "@/components/CalendarApp";
import { readEvents, readMeta } from "@/lib/store";
import { weekIndexForDate } from "@/lib/grid";
import { toIsoDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Explore — Bootsing",
};

// Always read fresh on the server: this is a living, chat-editable dataset.
export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
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
    Number.isInteger(w) && w >= 0 ? w : weekIndexForDate(meta.weeks, toIsoDate(new Date()));
  return <CalendarApp initialEvents={events} meta={meta} initialWeekIndex={initialWeekIndex} />;
}

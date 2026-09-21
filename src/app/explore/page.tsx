import type { Metadata } from "next";
import { CalendarApp } from "@/components/calendar/CalendarApp";
import { LoadErrorScreen } from "@/components/shared/LoadErrorScreen";
import { loadCalendarPage } from "@/lib/page-data";

export const metadata: Metadata = {
  title: "Explore — Bootsing",
};

// Always read fresh from the database: this is a living, editable dataset.
export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const data = await loadCalendarPage(searchParams);
  if (!data.ok) return <LoadErrorScreen message={data.message} />;
  return (
    <CalendarApp
      initialEvents={data.events}
      meta={data.meta}
      initialWeekIndex={data.initialWeekIndex}
    />
  );
}

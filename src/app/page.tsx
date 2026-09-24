import { LoginScreen } from "@/components/auth/LoginScreen";
import { HomeApp } from "@/components/home/HomeApp";
import { LoadErrorScreen } from "@/components/shared/LoadErrorScreen";
import { getSessionUser } from "@/lib/auth";
import { loadCalendarPage } from "@/lib/page-data";

// Always read fresh from the database: this is a living, editable dataset,
// not something to freeze at build time.
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  if (!(await getSessionUser())) return <LoginScreen />;
  const data = await loadCalendarPage(searchParams);
  if (!data.ok) return <LoadErrorScreen message={data.message} />;
  return (
    <HomeApp
      initialEvents={data.events}
      meta={data.meta}
      initialWeekIndex={data.initialWeekIndex}
    />
  );
}

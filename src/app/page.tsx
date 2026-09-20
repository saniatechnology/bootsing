import { CalendarApp, LoadErrorScreen } from "@/components/CalendarApp";
import { readEvents, readMeta } from "@/lib/store";

// Always read the current file on the server at request time — this is a
// living, chat-editable dataset, not something to statically freeze at build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  let events: Awaited<ReturnType<typeof readEvents>>;
  let meta: Awaited<ReturnType<typeof readMeta>>;
  try {
    [events, meta] = await Promise.all([readEvents(), readMeta()]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load your calendar.";
    return <LoadErrorScreen message={message} />;
  }
  return <CalendarApp initialEvents={events} meta={meta} />;
}

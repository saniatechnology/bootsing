import { CalendarApp } from "@/components/CalendarApp";
import { readEvents, readMeta } from "@/lib/store";

// Always read the current file on the server at request time — this is a
// living, chat-editable dataset, not something to statically freeze at build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [events, meta] = await Promise.all([readEvents(), readMeta()]);
  return <CalendarApp initialEvents={events} meta={meta} />;
}

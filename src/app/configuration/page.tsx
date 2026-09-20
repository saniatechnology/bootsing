import type { Metadata } from "next";
import { ConfigurationEditor } from "@/components/ConfigurationEditor";
import { readPreferences } from "@/lib/store";

export const metadata: Metadata = {
  title: "Configuration — Bootsing",
};

// Preferences are editable and stored per-user, so read them fresh per request.
export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  const preferences = await readPreferences();
  return <ConfigurationEditor initial={preferences} />;
}

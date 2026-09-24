import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfigurationEditor } from "@/components/ConfigurationEditor";
import { getSessionUser } from "@/lib/auth";
import { readPreferences } from "@/lib/store";

export const metadata: Metadata = {
  title: "Configuration — Bootsing",
};

// Preferences are editable and stored per-user, so read them fresh per request.
export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  if (!(await getSessionUser())) redirect("/");
  const preferences = await readPreferences();
  return <ConfigurationEditor initial={preferences} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountEditor } from "@/components/account/AccountEditor";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account — Bootsing",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return <AccountEditor initialUsername={user.username} initialEmail={user.email} />;
}

import { NextResponse } from "next/server";
import { readEvents, readMeta } from "@/lib/store";

export async function GET() {
  const [events, meta] = await Promise.all([readEvents(), readMeta()]);
  return NextResponse.json({ events, meta });
}

import { NextResponse } from "next/server";
import { readPreferences, writePreferences } from "@/lib/store";
import { preferencesSchema } from "@/lib/validation";

export async function GET() {
  try {
    const preferences = await readPreferences();
    return NextResponse.json({ preferences });
  } catch (err) {
    console.error("[GET /api/preferences]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const preferences = await writePreferences(parsed.data);
    return NextResponse.json({ preferences });
  } catch (err) {
    console.error("[PUT /api/preferences]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

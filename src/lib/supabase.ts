import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * supabase-js eagerly constructs a realtime client that needs a `WebSocket`
 * constructor. We only use the Postgres REST API here, never realtime, but
 * Node < 22 has no global `WebSocket`, so a no-op stub keeps `createClient`
 * from throwing on startup. It's never actually used.
 */
function ensureWebSocket(): void {
  const g = globalThis as { WebSocket?: unknown };
  if (typeof g.WebSocket === "undefined") {
    g.WebSocket = class {};
  }
}

/** Service-role client — bypasses RLS, so this module must never be imported into browser code. */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Copy .env.example to .env.local and fill them in."
      );
    }
    ensureWebSocket();
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/** The single current user until real auth is added; every query scopes to this id. */
export function getCurrentUserId(): string {
  const id = process.env.DEFAULT_USER_ID;
  if (!id) {
    throw new Error("DEFAULT_USER_ID is not set. See .env.example.");
  }
  return id;
}

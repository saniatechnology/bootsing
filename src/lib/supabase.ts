import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

let client: SupabaseClient | null = null;

const ENV_HINT = "Copy .env.example to .env.local and fill it in.";

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
    const url = requireEnv("SUPABASE_URL", ENV_HINT);
    const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY", ENV_HINT);
    ensureWebSocket();
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/** The single current user until real auth is added; every query scopes to this id. */
export function getCurrentUserId(): string {
  return requireEnv("DEFAULT_USER_ID", ENV_HINT);
}

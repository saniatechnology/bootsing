// Adds or updates the login user from the credentials in .env.local. The row's
// id is DEFAULT_USER_ID, so it owns the data written by scripts/seed.mjs. The
// password is bcrypt-hashed; the plaintext is never stored. Run with:
//
//   npm run seed:user    (node --env-file=.env.local scripts/seed-user.mjs)
//
// Re-running overwrites the username, email and password with the current
// .env.local values (upsert on id), but leaves all other tables untouched.
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_USER_ID, SEED_USERNAME, SEED_EMAIL } =
  process.env;
const SEED_PASSWORD = process.env.SEED_PASSWORD;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEFAULT_USER_ID) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEFAULT_USER_ID (e.g. run with --env-file=.env.local)."
  );
}
if (!SEED_USERNAME || !SEED_PASSWORD) {
  throw new Error("Set SEED_USERNAME and SEED_PASSWORD to create or update the login user.");
}

// supabase-js eagerly initializes a realtime client that needs a WebSocket
// constructor. We never use realtime here, so a no-op stub is enough on Node < 22.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class {};
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const username = SEED_USERNAME.trim().toLowerCase();
const email = SEED_EMAIL ? SEED_EMAIL.trim().toLowerCase() : null;

const { error } = await supabase.from("users").upsert(
  {
    id: DEFAULT_USER_ID,
    username,
    email,
    password_hash: await bcrypt.hash(SEED_PASSWORD, 12),
    updated_at: new Date().toISOString(),
  },
  { onConflict: "id" }
);
if (error) throw new Error(`upsert user: ${error.message}`);

console.log(`Saved login user "${username}" (${email ?? "no email"}) as ${DEFAULT_USER_ID}.`);

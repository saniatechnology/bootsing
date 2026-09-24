import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { getSupabaseClient } from "./supabase";

/**
 * Username/password auth backed by two tables: `users` (credentials) and
 * `sessions` (one row per active login). The browser holds only an opaque
 * random token in an httpOnly cookie; the database stores its sha256 hash, so
 * a leaked table can't be replayed as a login. Every request resolves the
 * signed-in user with `getSessionUser`, which is memoised per request.
 */

const SESSION_COOKIE = "bootsing_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BCRYPT_COST = 12;

export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
}

// ---- Passwords ----

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---- Sessions ----

/** The token is random and opaque; only this hash is ever stored or compared. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a session for a user and return the raw token to put in the cookie. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("sessions").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return token;
}

/** Delete a single session by its cookie token. No-op when the token is unknown. */
export async function destroySession(token: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("sessions").delete().eq("token_hash", hashToken(token));
  if (error) throw new Error(`Failed to sign out: ${error.message}`);
}

/** Delete every session for a user (used on password change and account deletion). */
export async function destroyUserSessions(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("sessions").delete().eq("user_id", userId);
  if (error) throw new Error(`Failed to clear sessions: ${error.message}`);
}

interface SessionRow {
  user_id: string;
  expires_at: string;
}

interface UserRow {
  id: string;
  username: string;
  email: string | null;
}

/**
 * The signed-in user for this request, or null. Memoised with React `cache`
 * so the several callers in one request (the route guard, the store's user
 * scoping) share a single database lookup.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = getSupabaseClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id,expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle<SessionRow>();
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return null;

  const { data: user } = await supabase
    .from("users")
    .select("id,username,email")
    .eq("id", session.user_id)
    .maybeSingle<UserRow>();
  return user ? { id: user.id, username: user.username, email: user.email } : null;
});

/** The signed-in user's id, or throw. Callers behind the API/page guards never hit the throw. */
export async function getCurrentUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ---- Cookie ----

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

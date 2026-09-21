import "server-only";

/**
 * Read a required environment variable, failing with a message that says
 * which one is missing and where to set it. Called lazily (on first use, not
 * at import time) so `next build` works without any secrets present.
 */
export function requireEnv(name: string, hint = "See .env.example."): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. ${hint}`);
  return value;
}

import type { OkResponse } from "@/lib/api-types";
import { clearSessionCookie, destroySession, readSessionToken } from "@/lib/auth";
import { apiRoute, jsonResponse } from "@/lib/http";

// Public: a signed-out request simply clears an already-absent cookie.
export const POST = apiRoute(
  "POST /api/auth/logout",
  async () => {
    const token = await readSessionToken();
    if (token) await destroySession(token);
    await clearSessionCookie();
    return jsonResponse<OkResponse>({ ok: true });
  },
  { public: true }
);

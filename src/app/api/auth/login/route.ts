import type { AuthResponse } from "@/lib/api-types";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { HttpError, apiRoute, jsonResponse, parseJsonBody } from "@/lib/http";
import { findUserByUsername } from "@/lib/store";
import { loginSchema } from "@/lib/validation";

// Public: this is how a signed-out visitor gets a session in the first place.
export const POST = apiRoute(
  "POST /api/auth/login",
  async (request) => {
    const { username, password } = await parseJsonBody(request, loginSchema);

    const user = await findUserByUsername(username);
    // One generic message for a bad username or a bad password.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Incorrect username or password.");
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);
    return jsonResponse<AuthResponse>({ user: { username: user.username, email: user.email } });
  },
  { public: true }
);

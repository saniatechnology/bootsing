import type { AuthResponse, OkResponse } from "@/lib/api-types";
import {
  clearSessionCookie,
  createSession,
  destroyUserSessions,
  getCurrentUserId,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { HttpError, apiRoute, jsonResponse, parseJsonBody } from "@/lib/http";
import {
  deleteAllUserData,
  deleteUser,
  getUserById,
  isEmailTaken,
  isUsernameTaken,
  updateUserAccount,
} from "@/lib/store";
import { accountDeleteSchema, accountUpdateSchema } from "@/lib/validation";

/** Change the username, email or password. Every change re-checks the current password. */
export const PATCH = apiRoute("PATCH /api/auth/account", async (request) => {
  const input = await parseJsonBody(request, accountUpdateSchema);
  const userId = await getCurrentUserId();

  const user = await getUserById(userId);
  if (!user) throw new HttpError(404, "Account not found.");
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new HttpError(401, "Current password is incorrect.");
  }

  let email = user.email;
  let username = user.username;

  if (input.field === "username") {
    if (await isUsernameTaken(input.username, userId)) {
      throw new HttpError(409, "That username is taken.");
    }
    username = input.username;
    await updateUserAccount(userId, { username });
  } else if (input.field === "email") {
    email = input.email === "" ? null : input.email;
    if (email && (await isEmailTaken(email, userId))) {
      throw new HttpError(409, "That email is already in use.");
    }
    await updateUserAccount(userId, { email });
  } else {
    await updateUserAccount(userId, { passwordHash: await hashPassword(input.newPassword) });
    // Invalidate every session, then re-issue one so this browser stays signed in.
    await destroyUserSessions(userId);
    await setSessionCookie(await createSession(userId));
  }

  return jsonResponse<AuthResponse>({ user: { username, email } });
});

/** Permanently delete the account and everything it owns. */
export const DELETE = apiRoute("DELETE /api/auth/account", async (request) => {
  const input = await parseJsonBody(request, accountDeleteSchema);
  const userId = await getCurrentUserId();

  const user = await getUserById(userId);
  if (!user) throw new HttpError(404, "Account not found.");
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new HttpError(401, "Current password is incorrect.");
  }

  await deleteAllUserData(userId);
  await deleteUser(userId); // sessions cascade with the user row
  await clearSessionCookie();
  return jsonResponse<OkResponse>({ ok: true });
});

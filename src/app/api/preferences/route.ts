import type { PreferencesResponse } from "@/lib/api-types";
import { apiRoute, jsonResponse, parseJsonBody } from "@/lib/http";
import { readPreferences, writePreferences } from "@/lib/store";
import { preferencesSchema } from "@/lib/validation";

export const GET = apiRoute("GET /api/preferences", async () => {
  return jsonResponse<PreferencesResponse>({ preferences: await readPreferences() });
});

export const PUT = apiRoute("PUT /api/preferences", async (request) => {
  const prefs = await parseJsonBody(request, preferencesSchema);
  return jsonResponse<PreferencesResponse>({ preferences: await writePreferences(prefs) });
});

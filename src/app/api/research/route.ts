import { z } from "zod";
import { HttpError, apiRoute, parseJsonBody } from "@/lib/http";
import { ndjsonResponse } from "@/lib/progress";
import { researchAndReplaceWeek } from "@/lib/research";
import { readMeta } from "@/lib/store";
import { isoDate } from "@/lib/validation";
import { isResearchableWeek } from "@/lib/weeks";

// Research uses web search + generation and can take a while; give it room.
export const maxDuration = 120;

const researchRequestSchema = z.object({
  weekStart: isoDate,
  weekEnd: isoDate,
});

/** Streams progress as NDJSON; the final `done` event carries a `ResearchApiResponse`. */
export const POST = apiRoute("POST /api/research", async (request) => {
  const { weekStart, weekEnd } = await parseJsonBody(request, researchRequestSchema);
  const meta = await readMeta();
  if (!isResearchableWeek(meta.weeks, [weekStart, weekEnd])) {
    throw new HttpError(400, "Unknown week.");
  }
  return ndjsonResponse((emit) => researchAndReplaceWeek(weekStart, weekEnd, emit));
});

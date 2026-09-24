import "server-only";

import type { z } from "zod";
import { getSessionUser } from "./auth";

/**
 * Small helpers shared by every API route so each handler only contains its
 * intent: parse the body against a schema, do the work, return JSON. Errors
 * are thrown as `HttpError` and turned into `{ error }` responses by
 * `apiRoute`, which also logs anything unexpected and answers 500.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** A JSON response with the body typed, so routes state the wire shape they return. */
export function jsonResponse<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

function describeIssue(issue: z.core.$ZodIssue | undefined): string {
  if (!issue) return "Invalid request";
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/**
 * Parse the request body as JSON and validate it. Throws a 400 `HttpError`
 * for non-JSON bodies or for the first validation issue (prefixed with its
 * field path, e.g. `link: Invalid URL`).
 */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S
): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, describeIssue(parsed.error.issues[0]));
  return parsed.data;
}

/** Parse a positive integer path segment such as an event id, or throw a 400. */
export function parsePositiveInt(raw: string, what: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Invalid ${what}`);
  return n;
}

/** The second argument Next passes to a route handler; `P` is the dynamic segment shape. */
export interface RouteContext<P = Record<string, never>> {
  params: Promise<P>;
}

export type RouteHandler<P = Record<string, never>> = (
  request: Request,
  ctx: RouteContext<P>
) => Promise<Response>;

/** Options for `apiRoute`. `public: true` skips the signed-in check (sign-in/out routes). */
export interface RouteOptions {
  public?: boolean;
}

/**
 * Wrap a route handler with uniform auth + error handling. Unless `public`,
 * the request must carry a valid session or it gets a 401 before the handler
 * runs. `HttpError`s become `{ error }` responses with their status; anything
 * else is logged under `label` and answered with a 500 carrying the message.
 */
export function apiRoute<P = Record<string, never>>(
  label: string,
  handler: RouteHandler<P>,
  options: RouteOptions = {}
): RouteHandler<P> {
  return async (request, ctx) => {
    try {
      if (!options.public && !(await getSessionUser())) {
        throw new HttpError(401, "You must be signed in.");
      }
      return await handler(request, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return jsonResponse({ error: err.message }, { status: err.status });
      }
      console.error(`[${label}]`, err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      return jsonResponse({ error: message }, { status: 500 });
    }
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, errorMessage, isAbortError } from "../api";
import type { ProgressEvent } from "../progress";
import { makeEvent } from "./fixtures";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ndjson(events: object[]): Response {
  return new Response(events.map((e) => JSON.stringify(e)).join("\n") + "\n", { status: 200 });
}

function stubFetch(...responses: Response[]) {
  const mock = vi.fn();
  for (const r of responses) mock.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => vi.unstubAllGlobals());

describe("event mutations", () => {
  it("PATCHes a single event and resolves with the returned event list", async () => {
    const events = [makeEvent({ id: 1, status: "boots" })];
    const fetchMock = stubFetch(json({ event: events[0], events }));
    await expect(api.updateEvent(1, { status: "boots" })).resolves.toEqual(events);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/events/1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "boots" }) })
    );
  });

  it("throws an ApiError carrying the server's message and status", async () => {
    stubFetch(json({ error: "No event with id 9" }, 404));
    const err = await api.deleteEvent(9).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ message: "No event with id 9", status: 404 });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    stubFetch(new Response("<html>gateway timeout</html>", { status: 504 }));
    await expect(api.createEvent({} as never)).rejects.toMatchObject({
      message: "Couldn't add the event.",
      status: 504,
    });
  });

  it("applies bulk changes one request at a time and returns the last list", async () => {
    const first = [makeEvent({ id: 1 })];
    const second = [makeEvent({ id: 1 }), makeEvent({ id: 2 })];
    const fetchMock = stubFetch(
      json({ event: first[0], events: first }),
      json({ event: second[1], events: second })
    );
    await expect(api.deleteEvents([1, 2])).resolves.toEqual(second);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["/api/events/1", "/api/events/2"]);
  });

  it("refuses an empty bulk operation instead of returning a misleading list", async () => {
    await expect(api.updateEvents([], { status: null })).rejects.toBeInstanceOf(ApiError);
  });
});

describe("streaming routes", () => {
  it("forwards progress events and resolves with the done payload", async () => {
    const done = { reply: "ok", proposedActions: [], history: [] };
    stubFetch(
      ndjson([
        { type: "stage", label: "Thinking" },
        { type: "text", delta: "hi" },
        { type: "done", data: done },
      ])
    );
    const seen: ProgressEvent[] = [];
    const result = await api.chat({ message: "m", history: [], selectedIds: [] }, undefined, (ev) =>
      seen.push(ev)
    );
    expect(result).toEqual(done);
    expect(seen).toEqual([
      { type: "stage", label: "Thinking" },
      { type: "text", delta: "hi" },
    ]);
  });

  it("rejects when the stream carries an error event", async () => {
    stubFetch(
      ndjson([
        { type: "stage", label: "x" },
        { type: "error", message: "model failed" },
      ])
    );
    await expect(
      api.research(["2026-10-19", "2026-10-25"], undefined, () => {})
    ).rejects.toMatchObject({ message: "model failed", status: 0 });
  });

  it("rejects when the stream ends without a done event", async () => {
    stubFetch(ndjson([{ type: "stage", label: "x" }]));
    await expect(
      api.chat({ message: "m", history: [], selectedIds: [] }, undefined, () => {})
    ).rejects.toMatchObject({ message: "The response ended before it finished." });
  });

  it("surfaces a non-2xx response before reading any stream", async () => {
    stubFetch(json({ error: "Unknown week." }, 400));
    await expect(
      api.research(["2026-01-01", "2026-01-02"], undefined, () => {})
    ).rejects.toMatchObject({ message: "Unknown week.", status: 400 });
  });
});

describe("error helpers", () => {
  it("recognises aborts and picks a user-facing message", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("x"))).toBe(false);
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(errorMessage("weird", "fallback")).toBe("fallback");
    expect(errorMessage(new Error(""), "fallback")).toBe("fallback");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { HttpError, apiRoute, jsonResponse, parseJsonBody, parsePositiveInt } from "../http";

function jsonRequest(body: string): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

const schema = z.object({ name: z.string().min(1, "name is required"), link: z.url() });

describe("parseJsonBody", () => {
  it("returns the parsed data for a valid body", async () => {
    const data = await parseJsonBody(jsonRequest('{"name":"x","link":"https://a.b"}'), schema);
    expect(data).toEqual({ name: "x", link: "https://a.b" });
  });

  it("rejects non-JSON with a 400", async () => {
    await expect(parseJsonBody(jsonRequest("not json"), schema)).rejects.toMatchObject({
      status: 400,
      message: "Request body must be JSON",
    });
  });

  it("reports the first validation issue prefixed with its field path", async () => {
    await expect(
      parseJsonBody(jsonRequest('{"name":"","link":"https://a.b"}'), schema)
    ).rejects.toMatchObject({ status: 400, message: "name: name is required" });
  });
});

describe("parsePositiveInt", () => {
  it("accepts positive integers and rejects everything else", () => {
    expect(parsePositiveInt("12", "event id")).toBe(12);
    for (const bad of ["0", "-3", "1.5", "abc", ""]) {
      expect(() => parsePositiveInt(bad, "event id")).toThrow(
        expect.objectContaining({ status: 400, message: "Invalid event id" })
      );
    }
  });
});

describe("apiRoute", () => {
  const ctx = { params: Promise.resolve({}) };

  afterEach(() => vi.restoreAllMocks());

  it("passes a successful response through untouched", async () => {
    const handler = apiRoute("test", async () => jsonResponse({ ok: true }, { status: 201 }));
    const res = await handler(jsonRequest("{}"), ctx);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("turns an HttpError into an { error } response with its status, without logging", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = apiRoute("test", async () => {
      throw new HttpError(404, "No event with id 7");
    });
    const res = await handler(jsonRequest("{}"), ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No event with id 7" });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs unexpected errors under the route label and answers 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = apiRoute("GET /api/x", async () => {
      throw new Error("db down");
    });
    const res = await handler(jsonRequest("{}"), ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "db down" });
    expect(errorSpy).toHaveBeenCalledWith("[GET /api/x]", expect.any(Error));
  });
});

import { describe, expect, it } from "vitest";
import { ndjsonResponse, readProgressStream, reduceProgress } from "../progress";
import type { ProgressEvent, ProgressLine } from "../progress";

describe("reduceProgress", () => {
  it("appends stage, search and result lines and ignores done/error", () => {
    let lines: ProgressLine[] = [];
    lines = reduceProgress(lines, { type: "stage", label: "Thinking" });
    lines = reduceProgress(lines, { type: "search", query: "jazz barcelona" });
    lines = reduceProgress(lines, { type: "result", title: "Marula", url: "https://m" });
    lines = reduceProgress(lines, { type: "done", data: null });
    lines = reduceProgress(lines, { type: "error", message: "x" });
    expect(lines).toEqual([
      { kind: "stage", text: "Thinking" },
      { kind: "search", text: "jazz barcelona" },
      { kind: "result", text: "Marula" },
    ]);
  });

  it("coalesces consecutive text deltas into one line", () => {
    let lines: ProgressLine[] = [{ kind: "stage", text: "Thinking" }];
    lines = reduceProgress(lines, { type: "text", delta: "Hel" });
    lines = reduceProgress(lines, { type: "text", delta: "lo" });
    lines = reduceProgress(lines, { type: "stage", label: "Saving" });
    lines = reduceProgress(lines, { type: "text", delta: "Done" });
    expect(lines).toEqual([
      { kind: "stage", text: "Thinking" },
      { kind: "text", text: "Hello" },
      { kind: "stage", text: "Saving" },
      { kind: "text", text: "Done" },
    ]);
  });
});

/** A Response whose body arrives in the given chunks. */
function chunkedResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    })
  );
}

async function collect(res: Response): Promise<ProgressEvent[]> {
  const events: ProgressEvent[] = [];
  await readProgressStream(res, (ev) => events.push(ev));
  return events;
}

describe("readProgressStream", () => {
  it("reassembles lines split across chunks and reads a tail without a trailing newline", async () => {
    const events = await collect(
      chunkedResponse(['{"type":"stage","la', 'bel":"A"}\n{"type":"text",', '"delta":"b"}'])
    );
    expect(events).toEqual([
      { type: "stage", label: "A" },
      { type: "text", delta: "b" },
    ]);
  });

  it("skips blank lines and handles a bodiless response", async () => {
    expect(await collect(chunkedResponse(['\n\n{"type":"done","data":1}\n\n']))).toEqual([
      { type: "done", data: 1 },
    ]);
    expect(await collect(new Response(null))).toEqual([]);
  });
});

describe("ndjsonResponse", () => {
  it("streams the emitted events followed by a done event with the handler's result", async () => {
    const res = ndjsonResponse(async (emit) => {
      emit({ type: "stage", label: "Working" });
      return { events: [] };
    });
    expect(res.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(await collect(res)).toEqual([
      { type: "stage", label: "Working" },
      { type: "done", data: { events: [] } },
    ]);
  });

  it("turns a thrown error into an error event and still closes the stream", async () => {
    const res = ndjsonResponse(async () => {
      throw new Error("boom");
    });
    expect(await collect(res)).toEqual([{ type: "error", message: "boom" }]);
  });

  it("drops emits after the client cancels instead of throwing", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let lateEmitThrew = false;
    const res = ndjsonResponse(async (emit) => {
      emit({ type: "stage", label: "before cancel" });
      await gate;
      try {
        emit({ type: "stage", label: "after cancel" });
      } catch {
        lateEmitThrew = true;
      }
      return "finished";
    });
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel();
    release();
    // Give the handler a tick to run past the gate.
    await new Promise((r) => setTimeout(r, 0));
    expect(lateEmitThrew).toBe(false);
  });
});

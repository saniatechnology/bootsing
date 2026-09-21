/** Streaming progress protocol shared by the research + chat AI flows. */
export type ProgressEvent =
  | { type: "stage"; label: string }
  | { type: "search"; query: string }
  | { type: "result"; title: string; url: string }
  | { type: "text"; delta: string }
  | { type: "done"; data: unknown }
  | { type: "error"; message: string };

export type ProgressEmit = (event: ProgressEvent) => void;

/** A single line in the live progress column; text lines accrue streamed deltas. */
export type ProgressLine = { kind: "stage" | "search" | "text" | "result"; text: string };

/** Folds a progress event into the running list of display lines. */
export function reduceProgress(lines: ProgressLine[], event: ProgressEvent): ProgressLine[] {
  if (event.type === "text") {
    const last = lines[lines.length - 1];
    if (last && last.kind === "text") {
      return [...lines.slice(0, -1), { kind: "text", text: last.text + event.delta }];
    }
    return [...lines, { kind: "text", text: event.delta }];
  }
  if (event.type === "stage") return [...lines, { kind: "stage", text: event.label }];
  if (event.type === "search") return [...lines, { kind: "search", text: event.query }];
  if (event.type === "result") return [...lines, { kind: "result", text: event.title }];
  return lines;
}

/**
 * Wraps a long-running handler in an NDJSON streaming Response. The handler
 * receives `emit` to push progress events; its return value is sent as a final
 * `done` event, and any throw becomes an `error` event so the client can react.
 */
export function ndjsonResponse(run: (emit: ProgressEmit) => Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit: ProgressEmit = (event) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const data = await run(emit);
        emit({ type: "done", data });
      } catch (err) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** Reads an NDJSON progress stream line by line, invoking `onEvent` per event. */
export async function readProgressStream(
  res: Response,
  onEvent: (event: ProgressEvent) => void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as ProgressEvent);
    }
  }
  const tail = buffer.trim();
  if (tail) onEvent(JSON.parse(tail) as ProgressEvent);
}

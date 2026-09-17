require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const EVENTS_PATH = path.join(__dirname, "data", "events.json");
const META_PATH = path.join(__dirname, "data", "meta.json");

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "WARNING: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key " +
      "(https://console.anthropic.com/settings/keys) or the chat box will fail."
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- tiny file-backed "database" ----------
// Fine for a single-user personal tool. If you outgrow it, swap these two
// functions for real DB reads/writes and nothing else has to change.
function readEvents() {
  return JSON.parse(fs.readFileSync(EVENTS_PATH, "utf8"));
}
function writeEvents(events) {
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2), "utf8");
}
function readMeta() {
  return JSON.parse(fs.readFileSync(META_PATH, "utf8"));
}
function nextId(events) {
  return events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
}

app.get("/api/events", (req, res) => {
  res.json({ events: readEvents(), meta: readMeta() });
});

// ---------- Claude tool definitions ----------
const CAT_KEYS = Object.keys(readMeta().cats);
const GENRE_KEYS = Object.keys(readMeta().genreLabels);

const TOOLS = [
  {
    type: "web_search_20260318",
    name: "web_search",
    max_uses: 3,
  },
  {
    name: "add_event",
    description:
      "Add a new event to the Barcelona cultural calendar. Dates are ISO yyyy-mm-dd. Use the same date for start and end for a single-day event.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Event title" },
        venue: { type: "string", description: "Venue or location" },
        cat: { type: "string", enum: CAT_KEYS, description: "Category key" },
        start: { type: "string", description: "Start date, ISO yyyy-mm-dd" },
        end: { type: "string", description: "End date, ISO yyyy-mm-dd" },
        cost: { type: "string", description: "e.g. 'Free', 'Paid', '€15'" },
        desc: { type: "string", description: "One or two sentence description" },
        link: { type: "string", description: "URL for more info" },
        flags: {
          type: "array",
          items: { type: "string", enum: ["closing", "rare", "finale"] },
          description: "Optional badges: closing (last chance), rare (one-off), finale",
        },
        approx: { type: "boolean", description: "True if the date is approximate/unconfirmed" },
        genre: {
          type: "string",
          enum: GENRE_KEYS,
          description: "Only for MUS category: music genre tag for the dance filter",
        },
      },
      required: ["name", "venue", "cat", "start", "end", "cost", "desc", "link"],
    },
  },
  {
    name: "edit_event",
    description: "Edit an existing event by id. Only pass the fields that should change.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "The event's id" },
        name: { type: "string" },
        venue: { type: "string" },
        cat: { type: "string", enum: CAT_KEYS },
        start: { type: "string" },
        end: { type: "string" },
        cost: { type: "string" },
        desc: { type: "string" },
        link: { type: "string" },
        flags: { type: "array", items: { type: "string", enum: ["closing", "rare", "finale"] } },
        approx: { type: "boolean" },
        genre: { type: "string", enum: GENRE_KEYS },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_event",
    description: "Remove an event from the calendar by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
];

function executeTool(name, input, events) {
  if (name === "add_event") {
    const id = nextId(events);
    const e = {
      id,
      name: input.name,
      venue: input.venue,
      cat: input.cat,
      start: input.start,
      end: input.end,
      cost: input.cost,
      desc: input.desc,
      link: input.link,
      flags: input.flags || [],
      approx: !!input.approx,
      genre: input.cat === "MUS" ? input.genre || "other" : null,
    };
    events.push(e);
    return { ok: true, event: e };
  }
  if (name === "edit_event") {
    const idx = events.findIndex((e) => e.id === input.id);
    if (idx === -1) return { ok: false, error: `No event with id ${input.id}` };
    const e = events[idx];
    for (const key of ["name", "venue", "cat", "start", "end", "cost", "desc", "link", "flags", "approx", "genre"]) {
      if (input[key] !== undefined) e[key] = input[key];
    }
    return { ok: true, event: e };
  }
  if (name === "delete_event") {
    const idx = events.findIndex((e) => e.id === input.id);
    if (idx === -1) return { ok: false, error: `No event with id ${input.id}` };
    const [removed] = events.splice(idx, 1);
    return { ok: true, removed };
  }
  return { ok: false, error: `Unknown tool ${name}` };
}

const SYSTEM_PROMPT = `You are the editing assistant for a personal Barcelona cultural events calendar.
You can add, edit, and delete events using the provided tools, and you can use web_search to look up
current information (e.g. a venue's schedule, whether an event is still happening, exact dates/prices)
before adding or editing an event — use it whenever the user asks you to "find" something or when you're
not confident about a detail rather than guessing.
Categories: ${CAT_KEYS.join(", ")}. Music genre tags (MUS category only): ${GENRE_KEYS.join(", ")}.
When the user describes an event in plain language, fill in reasonable values for any field they didn't specify
(e.g. guess a sensible category, leave cost as "Unknown" if not given) rather than refusing to act, but ask a
short clarifying question if the request is genuinely ambiguous (e.g. which of several same-named events to edit).
After making changes, reply with a brief, friendly confirmation of exactly what you did, and mention when a
detail came from a web search rather than what the user told you. Always use ISO yyyy-mm-dd dates.`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const events = readEvents();
    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    const changes = [];
    let finalText = "";

    // Simple agentic tool-use loop: keep calling Claude until it stops
    // requesting tools, executing each tool call against the file store
    // in between. Capped so a runaway loop can't spin forever.
    for (let turn = 0; turn < 6; turn++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1536,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });

      // web_search is executed server-side by the API itself (it returns
      // "server_tool_use" / "web_search_tool_result" blocks, not "tool_use"),
      // so this only ever picks up our own add/edit/delete_event calls —
      // nothing here needs to special-case web_search.
      const CUSTOM_TOOL_NAMES = new Set(TOOLS.filter((t) => t.input_schema).map((t) => t.name));
      const toolUses = response.content.filter((b) => b.type === "tool_use" && CUSTOM_TOOL_NAMES.has(b.name));
      const textBlocks = response.content.filter((b) => b.type === "text");
      finalText = textBlocks.map((b) => b.text).join("\n") || finalText;

      if (toolUses.length === 0) break;

      const toolResults = toolUses.map((tu) => {
        const result = executeTool(tu.name, tu.input, events);
        changes.push({ tool: tu.name, input: tu.input, result });
        return {
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        };
      });
      messages.push({ role: "user", content: toolResults });

      if (response.stop_reason !== "tool_use") break;
    }

    if (changes.length > 0) writeEvents(events);

    res.json({
      reply: finalText || "Done.",
      changes,
      events: readEvents(),
      history: messages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Barcelona calendar app running at http://localhost:${PORT}`);
});

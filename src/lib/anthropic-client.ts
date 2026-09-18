import "server-only";

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Lazily constructed so a missing key surfaces as a clear error on first use, not at import time. */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key " +
          "from https://console.anthropic.com/settings/keys"
      );
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const CHAT_MODEL = "claude-sonnet-5";

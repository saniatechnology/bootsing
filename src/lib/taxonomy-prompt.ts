import { CATEGORY_KEYS, GENRE_KEYS } from "./types";

/**
 * The category/genre vocabulary as explained to Claude, shared by the chat
 * and research system prompts so both agents map the same colloquial terms to
 * the same tags.
 */
export function taxonomyPromptSection(): string {
  return `Categories: ${CATEGORY_KEYS.join(", ")}.
Music genre tags (MUS category only): ${GENRE_KEYS.join(", ")}.
Map colloquial music terms to those tags: techno / house / EDM / rave / trance -> electronic;
reggaeton / salsa / bachata -> latin; rap / trap -> hiphop; anything spanning several -> mixed.`;
}

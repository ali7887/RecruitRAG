import { CHUNK_MAX_WORDS, CHUNK_MIN_WORDS } from "@/lib/constants";
import type { Chunk } from "@/lib/types";

// Split resume text into word-bounded chunks of CHUNK_MIN_WORDS–CHUNK_MAX_WORDS.
// Smaller, focused chunks improve embedding relevance and reduce hallucinations.
export function chunkText(text: string): Chunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK_MAX_WORDS) {
    chunks.push(words.slice(i, i + CHUNK_MAX_WORDS).join(" "));
  }

  // Merge a too-small trailing chunk into the previous one so every chunk
  // (except a lone first chunk) holds at least CHUNK_MIN_WORDS words.
  if (chunks.length > 1) {
    const trailingWords = words.length - CHUNK_MAX_WORDS * (chunks.length - 1);
    if (trailingWords < CHUNK_MIN_WORDS) {
      const last = chunks.pop()!;
      chunks[chunks.length - 1] += ` ${last}`;
    }
  }

  return chunks.map((chunkText, id) => ({ id, text: chunkText }));
}

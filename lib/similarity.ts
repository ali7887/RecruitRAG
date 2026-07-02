import { RETRIEVAL_TOP_K } from "@/lib/constants";
import type { EmbeddedChunk } from "@/lib/types";

// An embedded chunk scored against a query vector.
export interface RankedChunk extends EmbeddedChunk {
  score: number;
}

// Cosine similarity of two equal-length vectors, in the range [-1, 1].
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Rank chunks by cosine similarity to the query and return the top K.
export function retrieveTopChunks(
  query: number[],
  chunks: EmbeddedChunk[],
  topK: number = RETRIEVAL_TOP_K,
): RankedChunk[] {
  return chunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(query, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Semantic selection (Phase 13): keep only sections whose similarity to the
// query exceeds `minScore`, capped at `maxChunks`, to cut noise and tokens.
// Falls back to the best `maxChunks` when nothing clears the threshold, so the
// scoring LLM never receives empty context.
export function selectRelevantChunks(
  query: number[],
  chunks: EmbeddedChunk[],
  minScore: number,
  maxChunks: number,
): RankedChunk[] {
  const ranked = chunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(query, chunk.embedding) }))
    .sort((a, b) => b.score - a.score);
  const relevant = ranked.filter((chunk) => chunk.score > minScore);
  return (relevant.length ? relevant : ranked).slice(0, maxChunks);
}

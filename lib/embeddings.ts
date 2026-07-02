import OpenAI from "openai";
import {
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_MAX_CHUNKS,
  EMBEDDING_MAX_RETRIES,
  EMBEDDING_MODEL,
  EMBEDDING_RETRY_BASE_DELAY_MS,
  EMBEDDING_TIMEOUT_MS,
} from "@/lib/constants";
import { env } from "@/lib/env";
import type { Chunk, EmbeddedChunk } from "@/lib/types";

// Thrown when OpenAI rejects a request for billing/quota reasons. Never retried,
// and surfaced to the client as a clean, actionable message.
export class QuotaExceededError extends Error {
  constructor() {
    super("OpenAI quota exceeded. Please check your OpenAI billing and usage limits.");
    this.name = "QuotaExceededError";
  }
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    // Per-request timeout so a stalled call fails fast instead of hanging.
    client = new OpenAI({ apiKey: env.openaiApiKey, timeout: EMBEDDING_TIMEOUT_MS });
  }
  return client;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Only transient timeout/network failures are worth retrying.
function isRetryable(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIConnectionTimeoutError ||
    error instanceof OpenAI.APIConnectionError
  );
}

// Billing/quota exhaustion: a 429 or explicit insufficient_quota code/type.
// This is not transient, so retrying only wastes time — fail immediately.
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false;
  return (
    error.code === "insufficient_quota" ||
    error.type === "insufficient_quota" ||
    error.status === 429
  );
}

// Embed one batch of strings with timeout + exponential-backoff retry.
// Returns embeddings in the same order as the input.
async function embedBatch(input: string[], batchIndex: number): Promise<number[][]> {
  console.log("Embedding batch", { batchSize: input.length, batchIndex });

  for (let attempt = 1; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
    try {
      const response = await getClient().embeddings.create({
        model: EMBEDDING_MODEL,
        input,
      });
      return response.data.map((item) => item.embedding);
    } catch (error) {
      if (isQuotaError(error)) {
        throw new QuotaExceededError();
      }
      if (!isRetryable(error) || attempt === EMBEDDING_MAX_RETRIES) {
        throw error;
      }
      console.warn("Embedding retry", { attempt, batchIndex });
      // attempt 1 failure → wait 500ms, attempt 2 failure → wait 1000ms, …
      await delay(EMBEDDING_RETRY_BASE_DELAY_MS * attempt);
    }
  }

  // Unreachable: the loop always returns or throws.
  throw new Error("Embedding failed after maximum retries");
}

// Embed a single string (used for the job description query vector).
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text], 0);
  return embedding;
}

// Simple process-lifetime cache for single-text embeddings (Phase 13). Repeated
// queries / job descriptions within a session skip the API call. Bounded so it
// cannot grow without limit.
const EMBEDDING_CACHE_MAX = 500;
const embeddingCache = new Map<string, number[]>();

export async function embedTextCached(text: string): Promise<number[]> {
  const key = text.trim();
  const cached = embeddingCache.get(key);
  if (cached) return cached;

  const embedding = await embedText(key);
  if (embeddingCache.size >= EMBEDDING_CACHE_MAX) embeddingCache.clear();
  embeddingCache.set(key, embedding);
  return embedding;
}

// Embed all chunks in sequential batches, preserving chunk order.
export async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];
  if (chunks.length > EMBEDDING_MAX_CHUNKS) {
    throw new Error("Resume too large to process");
  }

  const embedded: EmbeddedChunk[] = [];

  for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
    const batchIndex = start / EMBEDDING_BATCH_SIZE;
    const vectors = await embedBatch(
      batch.map((chunk) => chunk.text),
      batchIndex,
    );

    batch.forEach((chunk, index) => {
      embedded.push({ ...chunk, embedding: vectors[index] });
    });
  }

  return embedded;
}

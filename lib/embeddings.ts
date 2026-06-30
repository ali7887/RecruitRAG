import OpenAI from "openai";
import { EMBEDDING_MODEL } from "@/lib/constants";
import { env } from "@/lib/env";
import type { Chunk, EmbeddedChunk } from "@/lib/types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

// Embed a single string (used for the job description query vector).
export async function embedText(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

// Embed many chunks in one request, preserving chunk order.
export async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];

  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: chunks.map((chunk) => chunk.text),
  });

  return chunks.map((chunk, index) => ({
    ...chunk,
    embedding: response.data[index].embedding,
  }));
}

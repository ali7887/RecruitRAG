import { listCandidates } from "@/lib/db/repository";
import { embedText } from "@/lib/embeddings";
import { env } from "@/lib/env";
import { cosineSimilarity } from "@/lib/similarity";
import type { CandidateRow } from "@/lib/db/schema";

// A candidate ranked against a search query. Score is 0–100 for display.
export interface CandidateMatch {
  id: string;
  name: string;
  email: string | null;
  score: number;
  snippet: string;
}

const SNIPPET_LENGTH = 140;

// Rank stored candidates by relevance to a free-text query.
//
// Semantic path: when real resume embeddings exist (live mode), the query is
// embedded once and compared to each candidate vector via cosine similarity.
// Deterministic path: in demo mode, or when no embeddings are stored, a
// term-frequency cosine over the raw resume text gives stable, offline results.
export async function searchCandidates(query: string): Promise<CandidateMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const candidates = await listCandidates();
  if (candidates.length === 0) return [];

  const canEmbed =
    !env.useDemoMode && candidates.some((candidate) => candidate.resumeEmbedding?.length);

  const scored = canEmbed
    ? await semanticScores(trimmed, candidates)
    : candidates.map((candidate) => ({
        candidate,
        score: lexicalScore(trimmed, candidate.resumeText),
      }));

  return scored
    .map(({ candidate, score }) => toMatch(candidate, score))
    .sort((a, b) => b.score - a.score);
}

async function semanticScores(
  query: string,
  candidates: CandidateRow[],
): Promise<{ candidate: CandidateRow; score: number }[]> {
  const queryEmbedding = await embedText(query);
  return candidates.map((candidate) => ({
    candidate,
    // Candidates without a stored vector fall back to lexical relevance.
    score: candidate.resumeEmbedding?.length
      ? cosineSimilarity(queryEmbedding, candidate.resumeEmbedding)
      : lexicalScore(query, candidate.resumeText),
  }));
}

function toMatch(candidate: CandidateRow, similarity: number): CandidateMatch {
  const text = candidate.resumeText.trim();
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    score: Math.round(Math.max(0, Math.min(1, similarity)) * 100),
    snippet: text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text,
  };
}

// Cosine similarity over term-frequency vectors of the query and resume text.
// Deterministic and dependency-free — the demo-mode ranking signal.
function lexicalScore(query: string, text: string): number {
  const queryFreq = termFrequency(query);
  if (queryFreq.size === 0) return 0;
  const textFreq = termFrequency(text);

  const vocabulary = new Set([...queryFreq.keys(), ...textFreq.keys()]);
  const queryVec: number[] = [];
  const textVec: number[] = [];
  for (const term of vocabulary) {
    queryVec.push(queryFreq.get(term) ?? 0);
    textVec.push(textFreq.get(term) ?? 0);
  }
  return cosineSimilarity(queryVec, textVec);
}

function termFrequency(input: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of input.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (token.length < 2) continue;
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return freq;
}

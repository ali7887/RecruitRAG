import { getProject, listAnalysesByProject, listCandidates } from "@/lib/db/repository";
import { embedTextCached } from "@/lib/embeddings";
import { env } from "@/lib/env";
import {
  calibrateSimilarity,
  expandQuery,
  matchStrengthLabel,
  mockRawCosine,
} from "@/lib/rag-optimizer";
import { cosineSimilarity } from "@/lib/similarity";
import type { CandidateRow } from "@/lib/db/schema";

// A candidate ranked against a search query. Score is 0–100 (calibrated).
export interface CandidateMatch {
  id: string;
  name: string;
  email: string | null;
  score: number;
  strength: string;
  snippet: string;
}

const SNIPPET_LENGTH = 140;

// Rank stored candidates by relevance to a free-text query.
//
// Semantic path: when real resume embeddings exist (live mode), the query is
// embedded once and compared to each candidate vector via cosine similarity.
// Deterministic path: in demo mode, or when no embeddings are stored, a
// term-frequency cosine over the raw resume text gives stable, offline results.
export async function searchCandidates(
  query: string,
  workspaceId: string,
  projectId?: string,
): Promise<CandidateMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let candidates = await listCandidates(workspaceId);
  // Restrict to candidates analyzed within a specific project when scoped, and
  // bias the query toward that project's keywords (Phase 13 query expansion).
  let expandedQuery = trimmed;
  if (projectId) {
    const [analyses, project] = await Promise.all([
      listAnalysesByProject(projectId),
      getProject(projectId, workspaceId),
    ]);
    const inProject = new Set(analyses.map((analysis) => analysis.candidateId));
    candidates = candidates.filter((candidate) => inProject.has(candidate.id));
    expandedQuery = expandQuery(trimmed, project?.requirements);
  }
  if (candidates.length === 0) return [];

  const canEmbed =
    !env.useDemoMode && candidates.some((candidate) => candidate.resumeEmbedding?.length);

  // Scores are calibrated to 0–100. Demo/lexical signals are run through the
  // same calibration via mocked raw cosines.
  const scored = canEmbed
    ? await semanticScores(expandedQuery, candidates)
    : candidates.map((candidate) => ({
        candidate,
        score: calibrateSimilarity(mockRawCosine(lexicalScore(expandedQuery, candidate.resumeText))),
      }));

  return scored
    .map(({ candidate, score }) => toMatch(candidate, score))
    .sort((a, b) => b.score - a.score);
}

async function semanticScores(
  query: string,
  candidates: CandidateRow[],
): Promise<{ candidate: CandidateRow; score: number }[]> {
  const queryEmbedding = await embedTextCached(query);
  return candidates.map((candidate) => ({
    candidate,
    // Candidates without a stored vector fall back to lexical relevance, mapped
    // into the raw-cosine band so both paths share one calibration.
    score: candidate.resumeEmbedding?.length
      ? calibrateSimilarity(cosineSimilarity(queryEmbedding, candidate.resumeEmbedding))
      : calibrateSimilarity(mockRawCosine(lexicalScore(query, candidate.resumeText))),
  }));
}

function toMatch(candidate: CandidateRow, score: number): CandidateMatch {
  const text = candidate.resumeText.trim();
  const calibrated = Math.max(0, Math.min(100, Math.round(score)));
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    score: calibrated,
    strength: matchStrengthLabel(calibrated),
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

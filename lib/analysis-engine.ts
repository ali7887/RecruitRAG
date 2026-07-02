import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { semanticChunks } from "@/lib/chunker";
import { ANALYSIS_MODEL, MAX_CONTEXT_CHUNKS, SEMANTIC_MIN_SIMILARITY } from "@/lib/constants";
import { embedChunks, embedTextCached } from "@/lib/embeddings";
import { env } from "@/lib/env";
import { formatFeedbackPatterns } from "@/lib/feedback-registry";
import {
  type Evidence,
  type EvaluatedAnalysis,
  type RubricScores,
} from "@/lib/evaluation-rubric";
import {
  buildScoreBreakdown,
  clampScore,
  combineScores,
  llmScoreFromRubric,
  similarityToScore,
} from "@/lib/scoring";
import { selectRelevantChunks, type RankedChunk } from "@/lib/similarity";
import type { EmbeddedChunk } from "@/lib/types";

const MAX_OUTPUT_TOKENS = 1536;

// Raw JSON shape returned by the analyze prompt (see prompts/analyze.md).
interface LlmAnalysis {
  llm_score: number;
  strengths: string[];
  gaps: string[];
  interview_questions: string[];
  rubricScores?: RubricScores;
  evidence?: Evidence;
  confidence?: number;
}

export interface EngineResult {
  analysis: EvaluatedAnalysis;
  // Mean of the resume chunk embeddings — a single vector for candidate storage.
  resumeEmbedding: number[];
}

// Core RAG + rubric analysis, shared by /api/analyze and the persistence
// server actions. Takes already-parsed resume text and a job description.
export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
): Promise<EngineResult> {
  const embeddedChunks = await embedChunks(semanticChunks(resumeText));
  const queryVector = await embedTextCached(jobDescription);
  // Semantic chunking: only sections relevant to the query reach the LLM,
  // reducing noise and token usage.
  const topChunks = selectRelevantChunks(
    queryVector,
    embeddedChunks,
    SEMANTIC_MIN_SIMILARITY,
    MAX_CONTEXT_CHUNKS,
  );

  const raw = await analyzeWithClaude(topChunks, jobDescription);

  const similarityScore = averageSimilarityScore(topChunks);
  const llmScore = raw.rubricScores
    ? llmScoreFromRubric(raw.rubricScores)
    : clampScore(raw.llm_score);
  const finalScore = combineScores(similarityScore, llmScore);

  const analysis: EvaluatedAnalysis = {
    finalScore,
    similarityScore,
    llmScore,
    strengths: raw.strengths,
    gaps: raw.gaps,
    interviewQuestions: raw.interview_questions,
    scoreBreakdown: buildScoreBreakdown(similarityScore, llmScore),
    ...(raw.rubricScores ? { rubricScores: raw.rubricScores } : {}),
    ...(raw.evidence ? { evidence: raw.evidence } : {}),
    ...(typeof raw.confidence === "number" ? { confidence: raw.confidence } : {}),
  };

  return { analysis, resumeEmbedding: meanEmbedding(embeddedChunks) };
}

function meanEmbedding(chunks: EmbeddedChunk[]): number[] {
  if (chunks.length === 0) return [];
  const dims = chunks[0].embedding.length;
  const sum = new Array<number>(dims).fill(0);
  for (const chunk of chunks) {
    for (let i = 0; i < dims; i++) sum[i] += chunk.embedding[i];
  }
  return sum.map((value) => value / chunks.length);
}

function averageSimilarityScore(chunks: RankedChunk[]): number {
  if (chunks.length === 0) return 0;
  const mean = chunks.reduce((total, chunk) => total + chunk.score, 0) / chunks.length;
  return similarityToScore(mean);
}

async function analyzeWithClaude(
  chunks: RankedChunk[],
  jobDescription: string,
): Promise<LlmAnalysis> {
  const prompt = await buildPrompt(chunks, jobDescription);
  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const message = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  return parseAnalysis(text);
}

let cachedTemplate: string | null = null;

async function loadPromptTemplate(): Promise<string> {
  if (cachedTemplate === null) {
    const file = path.join(process.cwd(), "prompts", "analyze.md");
    cachedTemplate = await fs.readFile(file, "utf8");
  }
  return cachedTemplate;
}

async function buildPrompt(chunks: RankedChunk[], jobDescription: string): Promise<string> {
  const template = await loadPromptTemplate();
  const context = chunks
    .map((chunk, index) => `[Chunk ${index + 1}]\n${chunk.text}`)
    .join("\n\n");

  return template
    .replace("{{retrieved_chunks}}", context)
    .replace("{{job_description}}", jobDescription)
    .replace("{{feedbackPatterns}}", formatFeedbackPatterns());
}

function parseAnalysis(text: string): LlmAnalysis {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("LLM response did not contain JSON.");
  }

  const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<LlmAnalysis>;
  return {
    llm_score: typeof parsed.llm_score === "number" ? parsed.llm_score : 0,
    strengths: toStringArray(parsed.strengths),
    gaps: toStringArray(parsed.gaps),
    interview_questions: toStringArray(parsed.interview_questions),
    rubricScores: parseRubric(parsed.rubricScores),
    evidence: parseEvidence(parsed.evidence),
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : undefined,
  };
}

const RUBRIC_KEYS: (keyof RubricScores)[] = [
  "coreSkills",
  "experience",
  "impact",
  "roleRequirements",
  "communication",
  "redFlagsPenalty",
];

function parseRubric(value: unknown): RubricScores | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const scores = {} as RubricScores;
  for (const key of RUBRIC_KEYS) {
    const raw = record[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
    scores[key] = clampScore(raw);
  }
  return scores;
}

function parseEvidence(value: unknown): Evidence | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  return {
    matchedSkills: toStringArray(record.matchedSkills).slice(0, 5),
    missingSkills: toStringArray(record.missingSkills).slice(0, 5),
    topSignals: toStringArray(record.topSignals).slice(0, 5),
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

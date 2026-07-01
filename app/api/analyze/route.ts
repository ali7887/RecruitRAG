import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { chunkText } from "@/lib/chunker";
import { ANALYSIS_MODEL } from "@/lib/constants";
import { getDemoAnalysisResult } from "@/lib/demo-analysis";
import { embedChunks, embedText, QuotaExceededError } from "@/lib/embeddings";
import { env } from "@/lib/env";
import { extractTextFromPdf } from "@/lib/parser";
import {
  buildScoreBreakdown,
  clampScore,
  combineScores,
  llmScoreFromRubric,
  similarityToScore,
} from "@/lib/scoring";
import {
  type Evidence,
  type EvaluatedAnalysis,
  type RubricScores,
} from "@/lib/evaluation-rubric";
import { retrieveTopChunks, type RankedChunk } from "@/lib/similarity";

// pdf-parse and prompt-file reads rely on Node APIs.
export const runtime = "nodejs";

const MAX_OUTPUT_TOKENS = 1536;

// Raw JSON shape returned by the analyze prompt (see prompts/analyze.md).
// Rubric/evidence/confidence are optional so older prompt output still parses.
interface LlmAnalysis {
  llm_score: number;
  strengths: string[];
  gaps: string[];
  interview_questions: string[];
  rubricScores?: RubricScores;
  evidence?: Evidence;
  confidence?: number;
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Expected multipart/form-data.", 400);
  }

  const file = form.get("file");
  const jobDescription = form.get("jobDescription");

  if (!(file instanceof File) || file.size === 0) {
    return errorResponse("A resume PDF file is required.", 400);
  }
  if (file.type !== "application/pdf") {
    return errorResponse("The resume must be a PDF file.", 400);
  }
  if (typeof jobDescription !== "string" || jobDescription.trim().length === 0) {
    return errorResponse("A job description is required.", 400);
  }

  // Demo mode: explicit opt-in only. Skip all external providers and return a
  // static analysis, with a small delay to preserve realistic UX.
  if (env.useDemoMode) {
    await sleep(800 + Math.floor(Math.random() * 400));
    return Response.json(getDemoAnalysisResult());
  }

  try {
    // Resume: PDF → text → chunks → embeddings.
    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractTextFromPdf(buffer);
    const embeddedChunks = await embedChunks(chunkText(resumeText));

    // Job description: query vector → top-K retrieval.
    const queryVector = await embedText(jobDescription);
    const topChunks = retrieveTopChunks(queryVector, embeddedChunks);

    // Claude analysis over the retrieved context.
    const analysis = await analyzeWithClaude(topChunks, jobDescription);

    // Rubric-driven scoring: prefer the weighted rubric; fall back to the raw
    // llm_score if the model didn't return a rubric.
    const similarityScore = averageSimilarityScore(topChunks);
    const llmScore = analysis.rubricScores
      ? llmScoreFromRubric(analysis.rubricScores)
      : clampScore(analysis.llm_score);
    const finalScore = combineScores(similarityScore, llmScore);

    const result: EvaluatedAnalysis = {
      finalScore,
      similarityScore,
      llmScore,
      strengths: analysis.strengths,
      gaps: analysis.gaps,
      interviewQuestions: analysis.interview_questions,
      scoreBreakdown: buildScoreBreakdown(similarityScore, llmScore),
      ...(analysis.rubricScores ? { rubricScores: analysis.rubricScores } : {}),
      ...(analysis.evidence ? { evidence: analysis.evidence } : {}),
      ...(typeof analysis.confidence === "number"
        ? { confidence: analysis.confidence }
        : {}),
    };
    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "PDF contains no readable text") {
      return errorResponse("PDF contains no readable text", 400);
    }
    if (error instanceof QuotaExceededError) {
      // Log full detail server-side; return a clean, actionable message.
      console.error("Analysis failed (quota):", error);
      return errorResponse(error.message, 429);
    }
    console.error("Analysis failed:", error);
    return errorResponse("Failed to analyze the resume.", 500);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

// Mean cosine similarity of the retrieved chunks, mapped to a 0–100 score.
function averageSimilarityScore(chunks: RankedChunk[]): number {
  if (chunks.length === 0) return 0;
  const mean = chunks.reduce((sum, chunk) => sum + chunk.score, 0) / chunks.length;
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
    .replace("{{job_description}}", jobDescription);
}

function parseAnalysis(text: string): LlmAnalysis {
  // The model is instructed to return JSON only; tolerate surrounding prose/fences.
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

// Accept a rubric only if every dimension is present and numeric; otherwise
// treat it as absent so the route falls back to the raw llm_score.
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

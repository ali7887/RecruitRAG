import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_MODEL } from "@/lib/constants";
import { env } from "@/lib/env";

const MAX_OUTPUT_TOKENS = 640;

// Structured, recruiter-facing briefing derived from a completed analysis.
export interface Briefing {
  aiSummary: string;
  technicalSummary: string;
  hiringRecommendation: string;
  interviewFocus: string[];
}

// The analysis fields a briefing is built from — no resume chunks, keeping the
// generation low-token since scoring already happened.
export interface BriefingInput {
  name: string;
  role: string;
  finalScore: number;
  similarityScore: number;
  llmScore: number;
  status: string;
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
}

// Coarse fit tier used by the deterministic briefing and the recommendation.
function tier(score: number): "strong" | "good" | "moderate" | "weak" {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 55) return "moderate";
  return "weak";
}

function recommendationFor(score: number): string {
  switch (tier(score)) {
    case "strong":
      return "Advance to final / onsite round — strong overall fit.";
    case "good":
      return "Proceed to a technical screen — promising fit with minor gaps.";
    case "moderate":
      return "Consider with reservations — validate the gaps before advancing.";
    default:
      return "Likely not a fit for this role as specified.";
  }
}

// Deterministic briefing built purely from existing analysis fields. Used in
// demo mode and as the graceful fallback when live generation is unavailable.
export function getDemoBriefing(input: BriefingInput): Briefing {
  const { name, role, finalScore, similarityScore, llmScore, strengths, gaps } = input;
  const lead = strengths[0] ?? "Relevant experience for the role";
  const gapText = gaps.length ? gaps.join("; ") : "no material gaps identified";

  return {
    aiSummary: `${name} is a ${tier(finalScore)} match for the ${role} role (${finalScore}/100). ${lead}.`,
    technicalSummary: `Similarity ${similarityScore} and rubric ${llmScore}. Strengths: ${strengths
      .slice(0, 3)
      .join("; ") || "—"}. Gaps: ${gapText}.`,
    hiringRecommendation: recommendationFor(finalScore),
    interviewFocus: buildInterviewFocus(input),
  };
}

function buildInterviewFocus(input: BriefingInput): string[] {
  const fromGaps = input.gaps.slice(0, 2).map((gap) => `Probe: ${gap}`);
  const fromQuestions = input.interviewQuestions.slice(0, 2);
  const focus = [...fromGaps, ...fromQuestions];
  return focus.length ? focus : ["Validate depth on the core requirements for this role."];
}

let cachedTemplate: string | null = null;

async function loadPromptTemplate(): Promise<string> {
  if (cachedTemplate === null) {
    const file = path.join(process.cwd(), "prompts", "briefing.md");
    cachedTemplate = await fs.readFile(file, "utf8");
  }
  return cachedTemplate;
}

function buildPrompt(template: string, input: BriefingInput): string {
  return template
    .replace("{{name}}", input.name)
    .replace("{{role}}", input.role)
    .replace("{{final_score}}", String(input.finalScore))
    .replace("{{similarity_score}}", String(input.similarityScore))
    .replace("{{llm_score}}", String(input.llmScore))
    .replace("{{status}}", input.status)
    .replace("{{strengths}}", input.strengths.map((s) => `- ${s}`).join("\n") || "- (none)")
    .replace("{{gaps}}", input.gaps.map((g) => `- ${g}`).join("\n") || "- (none)");
}

// Live briefing via Claude. Constrained, low-token, JSON out. Mirrors the
// analyze-engine integration pattern (prompt file → messages.create → parse).
export async function generateBriefing(input: BriefingInput): Promise<Briefing> {
  const template = await loadPromptTemplate();
  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const message = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: "user", content: buildPrompt(template, input) }],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  return parseBriefing(text, input);
}

// Parse the model's JSON, falling back to deterministic fields per-key so a
// malformed or partial response never yields empty briefing sections.
function parseBriefing(text: string, input: BriefingInput): Briefing {
  const fallback = getDemoBriefing(input);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return fallback;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return fallback;
  }

  const focus = Array.isArray(parsed.interview_focus)
    ? parsed.interview_focus.filter((item): item is string => typeof item === "string")
    : [];

  return {
    aiSummary: str(parsed.executive_summary) ?? fallback.aiSummary,
    technicalSummary: str(parsed.technical_summary) ?? fallback.technicalSummary,
    hiringRecommendation: str(parsed.hiring_recommendation) ?? fallback.hiringRecommendation,
    interviewFocus: focus.length ? focus.slice(0, 4) : fallback.interviewFocus,
  };
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

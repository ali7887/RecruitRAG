import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_MODEL } from "@/lib/constants";
import { env } from "@/lib/env";

const MAX_OUTPUT_TOKENS = 512;
const MAX_SKILLS = 12;
const WORK_SUMMARY_MAX = 320;

// Strip control characters (below space, except tab/newline, plus DEL). Built via
// the RegExp constructor with \x escapes so the source stays ASCII-clean.
const CONTROL_CHARS = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "g");

// Lightweight structured profile extracted from a resume (Phase 12). Deliberately
// minimal — not a full ATS parse.
export interface ParsedResume {
  headline: string;
  skills: string[];
  experienceYears: number | null;
  workSummary: string;
}

// Deterministic text cleanup applied before analysis, embedding, and parsing so
// downstream stages see normalized text instead of raw PDF noise.
export function normalizeResumeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n") // unify line endings
    .replace(CONTROL_CHARS, "") // strip control chars (keep tab, newline)
    .replace(/[^\S\n]*[•·▪◦‣]\s*/g, "\n- ") // bullets -> "- "
    .replace(/[ \t]+/g, " ") // collapse runs of spaces/tabs
    .replace(/[^\S\n]*\n[^\S\n]*/g, "\n") // trim whitespace around newlines
    .replace(/\n{3,}/g, "\n\n") // cap blank-line runs
    .trim();
}

// Curated, non-overlapping skill vocabulary for the deterministic fallback.
const SKILL_VOCAB = [
  "React", "TypeScript", "JavaScript", "Next.js", "Tailwind CSS", "Node.js",
  "PostgreSQL", "REST APIs", "GraphQL", "Python", "RAG", "Embeddings",
  "Vector search", "OpenAI", "Anthropic", "Docker", "Kubernetes", "AWS",
  "GCP", "Vercel", "CI/CD", "Testing", "Accessibility", "Design systems",
  "Redis", "Prisma", "Drizzle",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Heuristic, LLM-free extraction. Deterministic: same text -> same profile.
// Used in demo mode, for seeding, and as the graceful fallback.
export function getDemoParsedResume(text: string): ParsedResume {
  const normalized = normalizeResumeText(text);
  const firstSentence = normalized.split(/[.\n]/)[0]?.trim() ?? "";
  const headline =
    firstSentence.length > 80 ? `${firstSentence.slice(0, 79)}…` : firstSentence;

  const skills = SKILL_VOCAB.filter((skill) =>
    new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(normalized),
  ).slice(0, MAX_SKILLS);

  const yearsMatch = normalized.match(/(\d{1,2})\s*\+?\s*years?/i);
  const experienceYears = yearsMatch ? Number(yearsMatch[1]) : null;

  const workSummary =
    normalized.length > WORK_SUMMARY_MAX
      ? `${normalized.slice(0, WORK_SUMMARY_MAX)}…`
      : normalized;

  return { headline, skills, experienceYears, workSummary };
}

let cachedTemplate: string | null = null;

async function loadPromptTemplate(): Promise<string> {
  if (cachedTemplate === null) {
    const file = path.join(process.cwd(), "prompts", "parse-resume.md");
    cachedTemplate = await fs.readFile(file, "utf8");
  }
  return cachedTemplate;
}

// The single LLM call for the phase: normalized text -> small structured JSON.
// Falls back per-field to the deterministic parse so output is never empty.
export async function parseResume(normalizedText: string): Promise<ParsedResume> {
  const template = await loadPromptTemplate();
  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const message = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: "user", content: template.replace("{{resume_text}}", normalizedText) }],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  return parseResponse(text, normalizedText);
}

function parseResponse(text: string, normalizedText: string): ParsedResume {
  const fallback = getDemoParsedResume(normalizedText);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return fallback;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return fallback;
  }

  const skills = Array.isArray(parsed.skills)
    ? parsed.skills.filter((s): s is string => typeof s === "string").slice(0, MAX_SKILLS)
    : [];
  const years = Number(parsed.experienceYears);

  return {
    headline: str(parsed.headline) ?? fallback.headline,
    skills: skills.length ? skills : fallback.skills,
    experienceYears:
      Number.isFinite(years) && years > 0 ? Math.round(years) : fallback.experienceYears,
    workSummary: str(parsed.workSummary) ?? fallback.workSummary,
  };
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

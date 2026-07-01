import type { AnalysisResult } from "@/lib/types";

// Per-dimension rubric scores, each 0–100. `redFlagsPenalty` is severity of
// gaps/red flags (0 = none, 100 = severe) and is subtracted, not added.
export interface RubricScores {
  coreSkills: number;
  experience: number;
  impact: number;
  roleRequirements: number;
  communication: number;
  redFlagsPenalty: number;
}

// Compact, evidence-based lists (max 5 items each) grounding the scores.
export interface Evidence {
  matchedSkills: string[];
  missingSkills: string[];
  topSignals: string[];
}

// Transparent breakdown of how finalScore was combined.
export interface ScoreBreakdown {
  similarity: number;
  llm: number;
  weights: { similarity: number; llm: number };
  rubric?: RubricScores;
}

// Optional, backward-compatible extension of the analysis payload. All added
// fields are optional so existing consumers keep working unchanged.
export interface EvaluatedAnalysis extends AnalysisResult {
  rubricScores?: RubricScores;
  evidence?: Evidence;
  confidence?: number;
  scoreBreakdown?: ScoreBreakdown;
}

export interface RubricDimension {
  key: keyof RubricScores;
  name: string;
  short: string; // compact UI label
  weight: number;
  guidance: string; // internal scoring guidance
}

// Weighted evaluation rubric. Weights sum to 1.0; the red-flags dimension is
// applied as a penalty (see llmScoreFromRubric in lib/scoring.ts).
export const RUBRIC: RubricDimension[] = [
  {
    key: "coreSkills",
    name: "Core Skills Match",
    short: "Core",
    weight: 0.3,
    guidance: "Overlap between demonstrated skills and the JD's required stack.",
  },
  {
    key: "experience",
    name: "Relevant Experience / Scope",
    short: "Exp",
    weight: 0.25,
    guidance: "Relevance, depth, and scope of experience for this role and seniority.",
  },
  {
    key: "impact",
    name: "Impact & Delivery Signals",
    short: "Impact",
    weight: 0.15,
    guidance: "Measurable ownership, outcomes, shipped work, and metrics.",
  },
  {
    key: "roleRequirements",
    name: "Role-specific Requirements",
    short: "Role",
    weight: 0.15,
    guidance: "Match to explicit must-haves (years, specific tools, domain).",
  },
  {
    key: "communication",
    name: "Communication / Collaboration",
    short: "Comms",
    weight: 0.1,
    guidance: "Collaboration, teamwork, and communication signals.",
  },
  {
    key: "redFlagsPenalty",
    name: "Red Flags / Gaps Penalty",
    short: "Flags",
    weight: 0.05,
    guidance: "Severity of gaps or missing must-haves (0 = none, 100 = severe).",
  },
];

// Weight lookup derived from RUBRIC so the two never drift.
export const RUBRIC_WEIGHTS = Object.fromEntries(
  RUBRIC.map((dimension) => [dimension.key, dimension.weight]),
) as Record<keyof RubricScores, number>;

// Positive dimensions shown in the compact UI rubric row (penalty excluded).
export const RUBRIC_POSITIVE = RUBRIC.filter((d) => d.key !== "redFlagsPenalty");

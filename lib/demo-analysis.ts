import type { EvaluatedAnalysis, RubricScores } from "@/lib/evaluation-rubric";
import {
  buildScoreBreakdown,
  clampScore,
  combineScores,
  llmScoreFromRubric,
} from "@/lib/scoring";

interface DemoProfile {
  specialty: string; // role id this candidate is strongest for
  base: RubricScores;
  strengths: string[];
  gaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
  topSignals: string[];
}

const KNOWN_ROLES = ["frontend", "fullstack", "ai"];

const DEMO_PROFILES: Record<string, DemoProfile> = {
  amir: {
    specialty: "frontend",
    base: { coreSkills: 88, experience: 80, impact: 74, roleRequirements: 84, communication: 80, redFlagsPenalty: 10 },
    strengths: [
      "Strong React and TypeScript alignment with the core stack",
      "Next.js App Router architecture and performance experience",
      "Design-system and accessibility fluency",
    ],
    gaps: ["Limited explicit backend ownership", "Sparse production AI/RAG exposure"],
    matchedSkills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Accessibility"],
    missingSkills: ["Backend ownership", "Production RAG"],
    topSignals: ["Design-system work", "App Router performance", "Shipped product UI"],
  },
  sara: {
    specialty: "fullstack",
    base: { coreSkills: 84, experience: 82, impact: 76, roleRequirements: 80, communication: 78, redFlagsPenalty: 12 },
    strengths: [
      "End-to-end Node.js and PostgreSQL delivery",
      "Solid API design and relational data modeling",
      "Testing and CI discipline across the stack",
    ],
    gaps: ["Less depth in advanced frontend polish", "Limited LLM/RAG experience"],
    matchedSkills: ["Node.js", "PostgreSQL", "REST APIs", "React", "Testing"],
    missingSkills: ["Vector search", "Design systems"],
    topSignals: ["Schema design", "Shipped services", "CI ownership"],
  },
  leo: {
    specialty: "ai",
    base: { coreSkills: 86, experience: 78, impact: 80, roleRequirements: 82, communication: 74, redFlagsPenalty: 14 },
    strengths: [
      "Hands-on RAG pipelines with embeddings and retrieval",
      "LLM API integration and structured prompting",
      "Evaluation and latency/cost optimization mindset",
    ],
    gaps: ["Collaboration signals less evidenced", "Frontend depth is secondary"],
    matchedSkills: ["RAG", "Embeddings", "Vector search", "OpenAI/Anthropic", "TypeScript"],
    missingSkills: ["Design systems", "Deep frontend UX"],
    topSignals: ["RAG evaluation", "Latency/cost tuning", "Prompt design"],
  },
};

const DEFAULT_PROFILE: DemoProfile = DEMO_PROFILES.amir;

// Small deterministic hash so different cells vary but stay stable across runs.
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Deterministic, rubric-consistent analysis for a candidate against a role.
// A custom/unknown role is treated as the candidate's strong suit so demo
// output stays believable; known mismatched roles are penalized.
export function getDemoAnalysisFor(candidateId: string, roleId: string): EvaluatedAnalysis {
  const profile = DEMO_PROFILES[candidateId] ?? DEFAULT_PROFILE;
  const known = KNOWN_ROLES.includes(roleId);
  const match = !known || profile.specialty === roleId;

  const jitter = (hash(`${candidateId}:${roleId}`) % 5) - 2; // -2..2
  const skillDrop = match ? 0 : 16;
  const penaltyAdd = match ? 0 : 22;

  const rubric: RubricScores = {
    coreSkills: clampScore(profile.base.coreSkills - skillDrop + jitter),
    experience: clampScore(profile.base.experience - (match ? 0 : 8) + jitter),
    impact: clampScore(profile.base.impact + jitter),
    roleRequirements: clampScore(profile.base.roleRequirements - skillDrop + jitter),
    communication: clampScore(profile.base.communication + jitter),
    redFlagsPenalty: clampScore(profile.base.redFlagsPenalty + penaltyAdd),
  };

  const llmScore = llmScoreFromRubric(rubric);
  const simBase = match ? 74 : 60;
  const similarityScore = clampScore(simBase + (hash(`sim:${candidateId}:${roleId}`) % 12));
  const finalScore = combineScores(similarityScore, llmScore);

  return {
    finalScore,
    similarityScore,
    llmScore,
    strengths: profile.strengths,
    gaps: profile.gaps,
    interviewQuestions: [
      "Walk through a project most relevant to this role.",
      "Where are you strongest, and where would you ramp up?",
      "How do you validate quality and measure impact in your work?",
    ],
    rubricScores: rubric,
    evidence: {
      matchedSkills: match ? profile.matchedSkills : profile.matchedSkills.slice(0, 2),
      missingSkills: profile.missingSkills,
      topSignals: profile.topSignals,
    },
    confidence: match ? 0.85 : 0.6,
    scoreBreakdown: buildScoreBreakdown(similarityScore, llmScore, rubric),
  };
}

// Single-analysis demo (USE_DEMO_MODE and the single-mode "Try demo" action).
export function getDemoAnalysisResult(): EvaluatedAnalysis {
  return getDemoAnalysisFor("amir", "frontend");
}

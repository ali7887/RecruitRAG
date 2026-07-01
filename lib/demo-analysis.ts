import type { EvaluatedAnalysis, RubricScores } from "@/lib/evaluation-rubric";
import { buildScoreBreakdown, combineScores, llmScoreFromRubric } from "@/lib/scoring";

// Deterministic rubric for the demo candidate (a frontend/React engineer).
const DEMO_RUBRIC: RubricScores = {
  coreSkills: 86,
  experience: 80,
  impact: 72,
  roleRequirements: 82,
  communication: 78,
  redFlagsPenalty: 12,
};

const DEMO_SIMILARITY_SCORE = 78;

// Static analysis used when USE_DEMO_MODE=true or the "Try demo" action runs.
// Scores are computed with the same framework as live mode, so llmScore,
// finalScore, and the breakdown stay internally consistent.
export function getDemoAnalysisResult(): EvaluatedAnalysis {
  const llmScore = llmScoreFromRubric(DEMO_RUBRIC);
  const finalScore = combineScores(DEMO_SIMILARITY_SCORE, llmScore);

  return {
    finalScore,
    similarityScore: DEMO_SIMILARITY_SCORE,
    llmScore,
    strengths: [
      "Strong React and TypeScript alignment with the role's core stack",
      "Relevant frontend architecture experience across Next.js App Router projects",
      "Good fit for product-focused engineering teams and fast iteration",
    ],
    gaps: [
      "Limited explicit backend ownership beyond API integration",
      "More production AI/RAG experience would strengthen the profile",
    ],
    interviewQuestions: [
      "Describe how you structure a large Next.js application.",
      "How do you prevent hydration issues in the App Router?",
      "How would you optimize a resume-matching RAG pipeline?",
    ],
    rubricScores: DEMO_RUBRIC,
    evidence: {
      matchedSkills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Accessibility"],
      missingSkills: ["Backend ownership", "Production RAG"],
      topSignals: ["Design-system work", "App Router performance", "Shipped product UI"],
    },
    confidence: 0.82,
    scoreBreakdown: buildScoreBreakdown(DEMO_SIMILARITY_SCORE, llmScore, DEMO_RUBRIC),
  };
}

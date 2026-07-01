import {
  RUBRIC_WEIGHTS,
  type RubricScores,
  type ScoreBreakdown,
} from "@/lib/evaluation-rubric";

// Final blend: finalScore = 0.45 * similarity + 0.55 * llmScore.
export const FINAL_SIMILARITY_WEIGHT = 0.45;
export const FINAL_LLM_WEIGHT = 0.55;

// Cosine band mapped onto the 0–100 score. Typical relevant embeddings land
// well inside [0.1, 0.7], so this band keeps scores believable.
const SIM_FLOOR = 0.1;
const SIM_CEIL = 0.7;

// Round and clamp any raw score into [0, 100].
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Convert a cosine similarity to a 0–100 score with a gentle smoothstep curve.
// The S-curve flattens near both ends, avoiding harsh extremes and reducing
// sensitivity to small cosine fluctuations.
export function similarityToScore(similarity: number): number {
  const t = Math.max(0, Math.min(1, (similarity - SIM_FLOOR) / (SIM_CEIL - SIM_FLOOR)));
  const smooth = t * t * (3 - 2 * t);
  return Math.round(smooth * 100);
}

// Weighted rubric → 0–100 LLM score. Positive dimensions add their weighted
// score; red flags subtract (a clean record contributes the full 0.05 weight).
export function llmScoreFromRubric(rubric: RubricScores): number {
  const positive =
    RUBRIC_WEIGHTS.coreSkills * clampScore(rubric.coreSkills) +
    RUBRIC_WEIGHTS.experience * clampScore(rubric.experience) +
    RUBRIC_WEIGHTS.impact * clampScore(rubric.impact) +
    RUBRIC_WEIGHTS.roleRequirements * clampScore(rubric.roleRequirements) +
    RUBRIC_WEIGHTS.communication * clampScore(rubric.communication);
  const cleanliness = RUBRIC_WEIGHTS.redFlagsPenalty * (100 - clampScore(rubric.redFlagsPenalty));
  return clampScore(positive + cleanliness);
}

// Combine the semantic similarity score with the LLM score, both 0–100.
export function combineScores(similarityScore: number, llmScore: number): number {
  return clampScore(
    FINAL_SIMILARITY_WEIGHT * similarityScore + FINAL_LLM_WEIGHT * llmScore,
  );
}

// Transparent, optional breakdown of how the final score was produced.
export function buildScoreBreakdown(
  similarityScore: number,
  llmScore: number,
  rubric?: RubricScores,
): ScoreBreakdown {
  return {
    similarity: similarityScore,
    llm: llmScore,
    weights: { similarity: FINAL_SIMILARITY_WEIGHT, llm: FINAL_LLM_WEIGHT },
    ...(rubric ? { rubric } : {}),
  };
}

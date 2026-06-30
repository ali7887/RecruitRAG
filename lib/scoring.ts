// Hybrid score weights: finalScore = 0.6 * similarity + 0.4 * llmScore.
const SIMILARITY_WEIGHT = 0.6;
const LLM_WEIGHT = 0.4;

// Convert a cosine similarity ([-1, 1], typically [0, 1]) to a 0–100 score.
export function similarityToScore(similarity: number): number {
  const clamped = Math.max(0, Math.min(1, similarity));
  return Math.round(clamped * 100);
}

// Combine the semantic similarity score with the LLM score, both on a 0–100
// scale, into the final 0–100 match score.
export function combineScores(similarityScore: number, llmScore: number): number {
  return Math.round(SIMILARITY_WEIGHT * similarityScore + LLM_WEIGHT * llmScore);
}

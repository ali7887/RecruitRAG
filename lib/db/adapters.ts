import type { AnalysisRow } from "@/lib/db/schema";
import type { EvaluatedAnalysis } from "@/lib/evaluation-rubric";

// Adapt a stored analysis row into the shape UI components expect.
export function analysisRowToEvaluated(row: AnalysisRow): EvaluatedAnalysis {
  return {
    finalScore: row.finalScore,
    similarityScore: row.similarityScore,
    llmScore: row.llmScore,
    strengths: row.strengths,
    gaps: row.gaps,
    interviewQuestions: row.interviewQuestions,
    ...(row.rubricScores ? { rubricScores: row.rubricScores } : {}),
    ...(row.evidence ? { evidence: row.evidence } : {}),
  };
}

import type { CandidateStatus } from "@/lib/constants";
import { getProjectDetails, type ProjectAnalysis } from "@/lib/db/repository";
import type { Evidence, RubricScores } from "@/lib/evaluation-rubric";
import { effectiveScore } from "@/lib/multi";

// Smart ATS automation (Phase 20): deterministic shortlisting / rejection /
// flagging from AI scores + rubric heuristics. Pure functions, no side effects.

const SHORTLIST_MIN = 75;
const REJECT_MAX = 40;
const RED_FLAG_PENALTY = 50;
const MISSING_SKILLS_FLAG = 3;

// The analysis fields automation reasons over.
export interface AutomationInput {
  finalScore: number;
  rubricScores?: RubricScores | null;
  evidence?: Evidence | null;
}

// Strong candidate → shortlist.
export function autoShortlist(input: AutomationInput): boolean {
  return input.finalScore >= SHORTLIST_MIN;
}

// Weak candidate or red flags → reject.
export function autoReject(input: AutomationInput): boolean {
  const redFlags = (input.rubricScores?.redFlagsPenalty ?? 0) >= RED_FLAG_PENALTY;
  return input.finalScore < REJECT_MAX || redFlags;
}

// Several required skills missing → flag for review.
export function autoFlag(input: AutomationInput): boolean {
  return (input.evidence?.missingSkills?.length ?? 0) >= MISSING_SKILLS_FLAG;
}

export interface AutomationOutcome {
  status: CandidateStatus | null;
  decision: string | null;
}

// Combined decision. Rejection wins over shortlisting; flagging is a soft signal
// that does not move the pipeline stage.
export function evaluateAutomation(input: AutomationInput): AutomationOutcome {
  if (autoReject(input)) return { status: "rejected", decision: "Auto-rejected" };
  if (autoShortlist(input)) return { status: "shortlisted", decision: "Auto-shortlisted" };
  if (autoFlag(input)) return { status: null, decision: "Flagged: Missing skills" };
  return { status: null, decision: null };
}

// Candidates for a project ranked by the effective (review-adjusted) score.
export async function rankCandidatesForProject(
  projectId: string,
  workspaceId: string,
): Promise<ProjectAnalysis[]> {
  const details = await getProjectDetails(projectId, workspaceId);
  if (!details) return [];
  return [...details.analyses].sort(
    (a, b) =>
      effectiveScore(b.finalScore, b.reviewStatus, b.adjustedFinalScore) -
      effectiveScore(a.finalScore, a.reviewStatus, a.adjustedFinalScore),
  );
}

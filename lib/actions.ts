"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { analyzeResume } from "@/lib/analysis-engine";
import { getDemoAnalysisFor } from "@/lib/demo-analysis";
import { QuotaExceededError } from "@/lib/embeddings";
import { env } from "@/lib/env";
import type { EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { extractTextFromPdf } from "@/lib/parser";
import {
  getDemoParsedResume,
  normalizeResumeText,
  parseResume,
  type ParsedResume,
} from "@/lib/resume-parser";
import { searchCandidates, type CandidateMatch } from "@/lib/search";
import type { CandidateStatus, ReviewStatus } from "@/lib/constants";
import type { AnalysisRow } from "@/lib/db/schema";
import { evaluateAutomation } from "@/lib/automation";
import { recordFeedbackPattern } from "@/lib/feedback-registry";
import {
  canWrite,
  getWorkspaceContext,
  ROLE_COOKIE,
  WORKSPACE_COOKIE,
} from "@/lib/workspace";
import {
  generateBriefing,
  getDemoBriefing,
  type Briefing,
  type BriefingInput,
} from "@/lib/briefing";
import {
  buildProjectJSON,
  buildProjectMarkdown,
  buildProjectSummary,
  type ExportFile,
} from "@/lib/export";
import {
  appendAuditLog,
  assignReviewer,
  clearAnalysisAutomation,
  createAnalysis,
  createProject,
  deleteCandidate,
  getAnalysis,
  getCandidate,
  getProject,
  getProjectDetails,
  getTopCandidates,
  updateAnalysisBriefing,
  updateAnalysisNotes,
  updateAnalysisReview,
  updateAnalysisStatus,
  upsertCandidate,
} from "@/lib/db/repository";

const MIN_JD_LENGTH = 30;

// Uniform result shape for guarded, non-form mutating actions (Phase 14 RBAC).
export interface ActionResult {
  success: boolean;
  error?: string;
}

const UNAUTHORIZED: ActionResult = {
  success: false,
  error: "Unauthorized: Insufficient permissions",
};

// Create a hiring project in the active workspace, then open it.
export async function createProjectAction(formData: FormData): Promise<void> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();
  if (!title) return;

  const project = await createProject({ workspaceId, title, description, requirements });
  await appendAuditLog({
    workspaceId,
    actorRole: role,
    action: "PROJECT_CREATE",
    targetId: project.id,
    targetName: project.title,
  });
  revalidatePath("/projects");
  revalidatePath("/insights");
  redirect(`/projects/${project.id}`);
}

// Ingest a resume, analyze it against the project's role, and persist both the
// candidate profile and the analysis. Uses deterministic demo output when demo
// mode is on, the JD is too short, or live analysis hits a quota error.
export async function analyzeCandidateAction(formData: FormData): Promise<void> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return;

  const projectId = String(formData.get("projectId") ?? "");
  const roleLabel = String(formData.get("role") ?? "").trim() || "Role";
  const jobDescription = String(formData.get("jobDescription") ?? "").trim();
  const file = formData.get("file");

  if (!projectId || !(file instanceof File) || file.size === 0) return;
  // Isolation: the project must belong to the active workspace.
  const project = await getProject(projectId, workspaceId);
  if (!project) return;

  let rawText = "";
  try {
    rawText = await extractTextFromPdf(Buffer.from(await file.arrayBuffer()));
  } catch {
    rawText = "";
  }

  // Normalized text replaces the raw PDF text everywhere downstream.
  const resumeText = normalizeResumeText(rawText) || file.name;

  let analysis: EvaluatedAnalysis;
  let resumeEmbedding: number[] | null = null;

  if (env.useDemoMode || jobDescription.length <= MIN_JD_LENGTH) {
    analysis = getDemoAnalysisFor(file.name, roleLabel);
  } else {
    try {
      const engine = await analyzeResume(resumeText, jobDescription);
      analysis = engine.analysis;
      resumeEmbedding = engine.resumeEmbedding;
    } catch (error) {
      // Ingestion resilience (Phase 15): degrade gracefully on any live-analysis
      // failure — quota, rate limit, timeout, or network — never crash the action.
      console.error("Live analysis failed; falling back to demo analysis", error);
      analysis = getDemoAnalysisFor(file.name, roleLabel);
    }
  }

  // The one structured-parse LLM call. Any failure (rate limit, timeout, bad
  // JSON) instantly falls back to the local heuristic parser and flags it.
  let parsed: ParsedResume;
  let parsedViaFallback = false;
  if (env.useDemoMode) {
    parsed = getDemoParsedResume(resumeText);
  } else {
    try {
      parsed = await parseResume(resumeText);
    } catch (error) {
      console.error("Resume parse failed; using heuristic fallback", error);
      parsed = getDemoParsedResume(resumeText);
      parsedViaFallback = true;
    }
  }

  const candidate = await upsertCandidate({
    workspaceId,
    name: file.name,
    resumeText,
    resumeEmbedding,
    parsed,
    parsedViaFallback,
  });

  // Smart ATS automation (Phase 20): derive a shortlist/reject/flag decision.
  const automation = evaluateAutomation({
    finalScore: analysis.finalScore,
    rubricScores: analysis.rubricScores ?? null,
    evidence: analysis.evidence ?? null,
  });

  await createAnalysis({
    projectId,
    candidateId: candidate.id,
    role: roleLabel,
    similarityScore: analysis.similarityScore,
    llmScore: analysis.llmScore,
    finalScore: analysis.finalScore,
    rubricScores: analysis.rubricScores ?? null,
    evidence: analysis.evidence ?? null,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    interviewQuestions: analysis.interviewQuestions,
    status: automation.status ?? undefined,
    automationDecision: automation.decision,
  });

  await appendAuditLog({
    workspaceId,
    actorRole: role,
    action: "ANALYSIS_RUN",
    targetId: candidate.id,
    targetName: candidate.name,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/candidates");
  revalidatePath("/insights");
}

// Move a candidate to a new pipeline stage, then refresh the affected views.
export async function updateAnalysisStatusAction(
  analysisId: string,
  status: CandidateStatus,
): Promise<AnalysisRow | null> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return null;

  const analysis = await updateAnalysisStatus(analysisId, status);
  if (analysis) {
    const candidate = await getCandidate(analysis.candidateId, workspaceId);
    await appendAuditLog({
      workspaceId,
      actorRole: role,
      action: "STATUS_CHANGE",
      targetId: analysis.candidateId,
      targetName: candidate?.name ?? "Candidate",
    });
    revalidatePath(`/projects/${analysis.projectId}`);
    revalidatePath(`/candidates/${analysis.candidateId}`);
    revalidatePath("/insights");
  }
  return analysis;
}

// Save recruiter notes for a candidate within its project.
export async function updateAnalysisNotesAction(
  analysisId: string,
  notes: string,
): Promise<AnalysisRow | null> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return null;

  const analysis = await updateAnalysisNotes(analysisId, notes);
  if (analysis) {
    const candidate = await getCandidate(analysis.candidateId, workspaceId);
    await appendAuditLog({
      workspaceId,
      actorRole: role,
      action: "NOTE_UPDATE",
      targetId: analysis.candidateId,
      targetName: candidate?.name ?? "Candidate",
    });
    revalidatePath(`/projects/${analysis.projectId}`);
    revalidatePath(`/candidates/${analysis.candidateId}`);
    revalidatePath("/insights");
  }
  return analysis;
}

// Generate an AI recruiter briefing for one analysis and persist it. Uses the
// deterministic briefing in demo mode or on quota exhaustion, mirroring
// analyzeCandidateAction. Null when unauthorized or out of workspace.
export async function generateBriefingAction(analysisId: string): Promise<Briefing | null> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return null;

  const analysis = await getAnalysis(analysisId);
  // Isolation: the analysis's project must belong to the active workspace.
  if (!analysis || !(await getProject(analysis.projectId, workspaceId))) return null;

  const candidate = await getCandidate(analysis.candidateId, workspaceId);
  const input: BriefingInput = {
    name: candidate?.name ?? "Candidate",
    role: analysis.role,
    finalScore: analysis.finalScore,
    similarityScore: analysis.similarityScore,
    llmScore: analysis.llmScore,
    status: analysis.status,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    interviewQuestions: analysis.interviewQuestions,
  };

  let briefing: Briefing;
  if (env.useDemoMode) {
    briefing = getDemoBriefing(input);
  } else {
    try {
      briefing = await generateBriefing(input);
    } catch (error) {
      if (!(error instanceof QuotaExceededError)) throw error;
      briefing = getDemoBriefing(input);
    }
  }

  await updateAnalysisBriefing(analysisId, briefing);
  revalidatePath(`/projects/${analysis.projectId}`);
  revalidatePath(`/candidates/${analysis.candidateId}`);
  return briefing;
}

// Delete a candidate from the active workspace (Owner/Recruiter only).
export async function deleteCandidateAction(candidateId: string): Promise<ActionResult> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return UNAUTHORIZED;

  // Capture the name before the row is purged, for the audit record.
  const candidate = await getCandidate(candidateId, workspaceId);
  const deleted = await deleteCandidate(candidateId, workspaceId);
  if (!deleted) return { success: false, error: "Candidate not found" };

  await appendAuditLog({
    workspaceId,
    actorRole: role,
    action: "CANDIDATE_DELETE",
    targetId: candidateId,
    targetName: candidate?.name ?? "Candidate",
  });
  revalidatePath("/candidates");
  revalidatePath("/insights");
  return { success: true };
}

// Human-in-the-loop score review (Phase 18): approve / adjust / reject. An
// adjusted score overrides the AI score in the UI. Owner/Recruiter only.
export async function reviewAnalysisAction(
  analysisId: string,
  reviewStatus: ReviewStatus,
  adjustedFinalScore?: number | null,
  reviewerNotes?: string | null,
): Promise<AnalysisRow | null> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return null;

  const existing = await getAnalysis(analysisId);
  if (!existing || !(await getProject(existing.projectId, workspaceId))) return null;

  const clampedScore =
    reviewStatus === "adjusted" && typeof adjustedFinalScore === "number"
      ? Math.max(0, Math.min(100, Math.round(adjustedFinalScore)))
      : null;

  const analysis = await updateAnalysisReview(analysisId, {
    reviewStatus,
    adjustedFinalScore: clampedScore,
    reviewerNotes: reviewerNotes ?? null,
  });
  if (!analysis) return null;

  // Feed validated reasoning back into future analysis prompts.
  if (reviewStatus === "approved" || reviewStatus === "adjusted") {
    const lead = analysis.strengths[0] ?? "relevant experience";
    recordFeedbackPattern(`[${analysis.role}] ${reviewStatus}: ${lead}`);
  }

  const candidate = await getCandidate(analysis.candidateId, workspaceId);
  await appendAuditLog({
    workspaceId,
    actorRole: role,
    action: "SCORE_REVIEW",
    targetId: analysis.candidateId,
    targetName: candidate?.name ?? "Candidate",
  });
  revalidatePath(`/candidates/${analysis.candidateId}`);
  revalidatePath(`/projects/${analysis.projectId}`);
  revalidatePath("/insights");
  return analysis;
}

// Assign a reviewer (Owner/Recruiter) to a candidate (Phase 19). Viewer cannot
// be assigned; passing null clears the assignment.
export async function assignReviewerAction(
  candidateId: string,
  reviewerId: string | null,
): Promise<ActionResult> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return UNAUTHORIZED;

  const assignee = reviewerId === "Owner" || reviewerId === "Recruiter" ? reviewerId : null;
  const candidate = await assignReviewer(candidateId, workspaceId, assignee);
  if (!candidate) return { success: false, error: "Candidate not found" };

  await appendAuditLog({
    workspaceId,
    actorRole: role,
    action: "REVIEWER_ASSIGN",
    targetId: candidateId,
    targetName: candidate.name,
  });
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/candidates");
  return { success: true };
}

// Recruiter override of an automated decision (Phase 20): clear the flag/label.
export async function clearAutomationAction(analysisId: string): Promise<AnalysisRow | null> {
  const { workspaceId, role } = await getWorkspaceContext();
  if (!canWrite(role)) return null;

  const existing = await getAnalysis(analysisId);
  if (!existing || !(await getProject(existing.projectId, workspaceId))) return null;

  const analysis = await clearAnalysisAutomation(analysisId);
  if (analysis) {
    revalidatePath(`/projects/${analysis.projectId}`);
    revalidatePath(`/candidates/${analysis.candidateId}`);
    revalidatePath("/insights");
  }
  return analysis;
}

// Build a full Markdown report for a project, ready to download. Null when the
// project is missing from the active workspace.
export async function exportProjectMarkdown(projectId: string): Promise<ExportFile | null> {
  const { workspaceId } = await getWorkspaceContext();
  const details = await getProjectDetails(projectId, workspaceId);
  return details ? buildProjectMarkdown(details) : null;
}

// Build an ATS-ready JSON export for a project.
export async function exportProjectJSON(projectId: string): Promise<ExportFile | null> {
  const { workspaceId } = await getWorkspaceContext();
  const details = await getProjectDetails(projectId, workspaceId);
  return details ? buildProjectJSON(details) : null;
}

// Build a short, HR-friendly plain-text summary of a project's top 3 candidates.
export async function exportProjectTextSummary(projectId: string): Promise<ExportFile | null> {
  const { workspaceId } = await getWorkspaceContext();
  const [details, top] = await Promise.all([
    getProjectDetails(projectId, workspaceId),
    getTopCandidates(projectId, workspaceId, 3),
  ]);
  return details ? buildProjectSummary(details, top) : null;
}

// Rank stored candidates against a free-text query for the candidates search
// bar, scoped to the active workspace and optionally a project.
export async function searchCandidatesAction(
  query: string,
  projectId?: string,
): Promise<CandidateMatch[]> {
  const { workspaceId } = await getWorkspaceContext();
  return searchCandidates(query, workspaceId, projectId);
}

// Switch the active workspace (mock tenancy); refresh all views.
export async function setWorkspaceAction(workspaceId: string): Promise<void> {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { path: "/" });
  revalidatePath("/", "layout");
}

// Switch the active role (mock RBAC); refresh all views.
export async function setRoleAction(role: string): Promise<void> {
  (await cookies()).set(ROLE_COOKIE, role, { path: "/" });
  revalidatePath("/", "layout");
}

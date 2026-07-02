"use server";

import { revalidatePath } from "next/cache";
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
import type { CandidateStatus } from "@/lib/constants";
import type { AnalysisRow } from "@/lib/db/schema";
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
  createAnalysis,
  createProject,
  getAnalysis,
  getCandidate,
  getProjectDetails,
  getTopCandidates,
  updateAnalysisBriefing,
  updateAnalysisNotes,
  updateAnalysisStatus,
  upsertCandidate,
} from "@/lib/db/repository";

const MIN_JD_LENGTH = 30;

// Create a hiring project, then open it.
export async function createProjectAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();
  if (!title) return;

  const project = await createProject({ title, description, requirements });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

// Ingest a resume, analyze it against the project's role, and persist both the
// candidate profile and the analysis. Uses deterministic demo output when demo
// mode is on, the JD is too short, or live analysis hits a quota error.
export async function analyzeCandidateAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");
  const role = String(formData.get("role") ?? "").trim() || "Role";
  const jobDescription = String(formData.get("jobDescription") ?? "").trim();
  const file = formData.get("file");

  if (!projectId || !(file instanceof File) || file.size === 0) return;

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
    analysis = getDemoAnalysisFor(file.name, role);
  } else {
    try {
      const engine = await analyzeResume(resumeText, jobDescription);
      analysis = engine.analysis;
      resumeEmbedding = engine.resumeEmbedding;
    } catch (error) {
      // Graceful degradation on quota exhaustion, consistent with the API route.
      if (!(error instanceof QuotaExceededError)) throw error;
      analysis = getDemoAnalysisFor(file.name, role);
    }
  }

  // The one structured-parse LLM call, with the same demo/quota fallback.
  let parsed: ParsedResume;
  if (env.useDemoMode) {
    parsed = getDemoParsedResume(resumeText);
  } else {
    try {
      parsed = await parseResume(resumeText);
    } catch (error) {
      if (!(error instanceof QuotaExceededError)) throw error;
      parsed = getDemoParsedResume(resumeText);
    }
  }

  const candidate = await upsertCandidate({
    name: file.name,
    resumeText,
    resumeEmbedding,
    parsed,
  });

  await createAnalysis({
    projectId,
    candidateId: candidate.id,
    role,
    similarityScore: analysis.similarityScore,
    llmScore: analysis.llmScore,
    finalScore: analysis.finalScore,
    rubricScores: analysis.rubricScores ?? null,
    evidence: analysis.evidence ?? null,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    interviewQuestions: analysis.interviewQuestions,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/candidates");
}

// Move a candidate to a new pipeline stage, then refresh the affected views.
export async function updateAnalysisStatusAction(
  analysisId: string,
  status: CandidateStatus,
): Promise<AnalysisRow | null> {
  const analysis = await updateAnalysisStatus(analysisId, status);
  if (analysis) {
    revalidatePath(`/projects/${analysis.projectId}`);
    revalidatePath(`/candidates/${analysis.candidateId}`);
  }
  return analysis;
}

// Save recruiter notes for a candidate within its project.
export async function updateAnalysisNotesAction(
  analysisId: string,
  notes: string,
): Promise<AnalysisRow | null> {
  const analysis = await updateAnalysisNotes(analysisId, notes);
  if (analysis) {
    revalidatePath(`/projects/${analysis.projectId}`);
    revalidatePath(`/candidates/${analysis.candidateId}`);
  }
  return analysis;
}

// Generate an AI recruiter briefing for one analysis and persist it. Uses the
// deterministic briefing in demo mode or on quota exhaustion, mirroring
// analyzeCandidateAction. Null when the analysis no longer exists.
export async function generateBriefingAction(analysisId: string): Promise<Briefing | null> {
  const analysis = await getAnalysis(analysisId);
  if (!analysis) return null;

  const candidate = await getCandidate(analysis.candidateId);
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

// Build a full Markdown report for a project, ready to download. Null when the
// project no longer exists.
export async function exportProjectMarkdown(projectId: string): Promise<ExportFile | null> {
  const details = await getProjectDetails(projectId);
  return details ? buildProjectMarkdown(details) : null;
}

// Build an ATS-ready JSON export for a project.
export async function exportProjectJSON(projectId: string): Promise<ExportFile | null> {
  const details = await getProjectDetails(projectId);
  return details ? buildProjectJSON(details) : null;
}

// Build a short, HR-friendly plain-text summary of a project's top 3 candidates.
export async function exportProjectTextSummary(projectId: string): Promise<ExportFile | null> {
  const [details, top] = await Promise.all([
    getProjectDetails(projectId),
    getTopCandidates(projectId, 3),
  ]);
  return details ? buildProjectSummary(details, top) : null;
}

// Rank stored candidates against a free-text query for the candidates search
// bar. When `projectId` is given, ranking is scoped to that project.
export async function searchCandidatesAction(
  query: string,
  projectId?: string,
): Promise<CandidateMatch[]> {
  return searchCandidates(query, projectId);
}

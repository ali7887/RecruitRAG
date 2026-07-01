"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeResume } from "@/lib/analysis-engine";
import { getDemoAnalysisFor } from "@/lib/demo-analysis";
import { QuotaExceededError } from "@/lib/embeddings";
import { env } from "@/lib/env";
import type { EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { extractTextFromPdf } from "@/lib/parser";
import { searchCandidates, type CandidateMatch } from "@/lib/search";
import { createAnalysis, createProject, upsertCandidate } from "@/lib/db/repository";

const MIN_JD_LENGTH = 30;

// Create a hiring project, then open it.
export async function createProjectAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) return;

  const project = await createProject({ title, description });
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

  let resumeText = "";
  try {
    resumeText = await extractTextFromPdf(Buffer.from(await file.arrayBuffer()));
  } catch {
    resumeText = "";
  }

  let analysis: EvaluatedAnalysis;
  let resumeEmbedding: number[] | null = null;

  if (env.useDemoMode || jobDescription.length <= MIN_JD_LENGTH) {
    analysis = getDemoAnalysisFor(file.name, role);
  } else {
    try {
      const engine = await analyzeResume(resumeText || file.name, jobDescription);
      analysis = engine.analysis;
      resumeEmbedding = engine.resumeEmbedding;
    } catch (error) {
      // Graceful degradation on quota exhaustion, consistent with the API route.
      if (!(error instanceof QuotaExceededError)) throw error;
      analysis = getDemoAnalysisFor(file.name, role);
    }
  }

  const candidate = await upsertCandidate({
    name: file.name,
    resumeText,
    resumeEmbedding,
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

// Rank stored candidates against a free-text query for the candidates search bar.
export async function searchCandidatesAction(query: string): Promise<CandidateMatch[]> {
  return searchCandidates(query);
}

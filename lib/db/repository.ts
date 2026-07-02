import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getMemoryStore } from "@/lib/db/memory";
import {
  analyses,
  auditLogs,
  candidates,
  projects,
  workspaces,
  type AnalysisRow,
  type AuditLogRow,
  type CandidateRow,
  type ProjectRow,
  type WorkspaceRow,
} from "@/lib/db/schema";
import type { Briefing } from "@/lib/briefing";
import {
  DEFAULT_CANDIDATE_STATUS,
  type CandidateStatus,
  type ReviewStatus,
} from "@/lib/constants";
import type { Evidence, RubricScores } from "@/lib/evaluation-rubric";
import type { ParsedResume } from "@/lib/resume-parser";

export interface NewProjectInput {
  workspaceId: string;
  title: string;
  description?: string;
  requirements?: string;
}

// A stored analysis flattened with its candidate's name, for project boards.
export interface ProjectAnalysis {
  analysisId: string;
  candidateId: string;
  name: string;
  role: string;
  status: CandidateStatus;
  notes: string;
  finalScore: number;
  similarityScore: number;
  llmScore: number;
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
  reviewStatus: ReviewStatus;
  adjustedFinalScore: number | null;
  automationDecision: string | null;
}

// A project plus its scored candidates (sorted by match) and headline metrics.
export interface ProjectDetails {
  project: ProjectRow;
  analyses: ProjectAnalysis[];
  candidateCount: number;
  averageScore: number;
}

// A project card summary: metadata plus candidate count and average match.
export interface ProjectSummary extends ProjectRow {
  candidateCount: number;
  averageScore: number;
}

export interface UpsertCandidateInput {
  workspaceId: string;
  name: string;
  email?: string | null;
  resumeText: string;
  resumeEmbedding?: number[] | null;
  // Lightweight structured profile from the parser (Phase 12).
  parsed?: ParsedResume | null;
  // True when the profile came from the heuristic fallback (Phase 15).
  parsedViaFallback?: boolean;
}

export interface NewAnalysisInput {
  projectId: string;
  candidateId: string;
  role: string;
  similarityScore: number;
  llmScore: number;
  finalScore: number;
  rubricScores?: RubricScores | null;
  evidence?: Evidence | null;
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
  // Optional pipeline stage + automated decision applied at creation (Phase 20).
  status?: CandidateStatus;
  automationDecision?: string | null;
}

// True when analyses should persist to Postgres; false when using the
// in-memory demo fallback (no DATABASE_URL).
export function isPersistent(): boolean {
  return getDb() !== null;
}

export async function listWorkspaces(): Promise<WorkspaceRow[]> {
  const db = getDb();
  if (!db) {
    return [...getMemoryStore().workspaces];
  }
  return db.select().from(workspaces).orderBy(desc(workspaces.createdAt));
}

export async function listProjects(workspaceId: string): Promise<ProjectRow[]> {
  const db = getDb();
  if (!db) {
    return getMemoryStore()
      .projects.filter((project) => project.workspaceId === workspaceId)
      .sort(byNewest);
  }
  return db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(projects.createdAt));
}

export async function getProject(id: string, workspaceId: string): Promise<ProjectRow | null> {
  const db = getDb();
  if (!db) {
    return (
      getMemoryStore().projects.find(
        (project) => project.id === id && project.workspaceId === workspaceId,
      ) ?? null
    );
  }
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createProject(input: NewProjectInput): Promise<ProjectRow> {
  const db = getDb();
  if (!db) {
    const project: ProjectRow = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description ?? "",
      requirements: input.requirements ?? "",
      createdAt: new Date(),
    };
    getMemoryStore().projects.unshift(project);
    return project;
  }
  const rows = await db
    .insert(projects)
    .values({
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description ?? "",
      requirements: input.requirements ?? "",
    })
    .returning();
  return rows[0];
}

// Projects with per-project metrics for the dashboard grid. Fetches all
// analyses once and groups in memory to avoid a query per project.
export async function listProjectSummaries(workspaceId: string): Promise<ProjectSummary[]> {
  const [allProjects, allAnalyses] = await Promise.all([
    listProjects(workspaceId),
    listAnalyses(workspaceId),
  ]);
  const byProject = new Map<string, AnalysisRow[]>();
  for (const analysis of allAnalyses) {
    const bucket = byProject.get(analysis.projectId);
    if (bucket) bucket.push(analysis);
    else byProject.set(analysis.projectId, [analysis]);
  }
  return allProjects.map((project) => {
    const rows = byProject.get(project.id) ?? [];
    const candidateCount = new Set(rows.map((row) => row.candidateId)).size;
    const averageScore = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.finalScore, 0) / rows.length)
      : 0;
    return { ...project, candidateCount, averageScore };
  });
}

// A project with its scored candidates (highest match first) and metrics.
export async function getProjectDetails(
  id: string,
  workspaceId: string,
): Promise<ProjectDetails | null> {
  const project = await getProject(id, workspaceId);
  if (!project) return null;

  const [rows, allCandidates] = await Promise.all([
    listAnalysesByProject(id),
    listCandidates(workspaceId),
  ]);
  const nameById = new Map(allCandidates.map((candidate) => [candidate.id, candidate.name]));

  const analyses: ProjectAnalysis[] = rows
    .map((row) => ({
      analysisId: row.id,
      candidateId: row.candidateId,
      name: nameById.get(row.candidateId) ?? "Unknown",
      role: row.role,
      status: row.status as CandidateStatus,
      notes: row.notes,
      finalScore: row.finalScore,
      similarityScore: row.similarityScore,
      llmScore: row.llmScore,
      strengths: row.strengths,
      gaps: row.gaps,
      interviewQuestions: row.interviewQuestions,
      reviewStatus: row.reviewStatus as ReviewStatus,
      adjustedFinalScore: row.adjustedFinalScore,
      automationDecision: row.automationDecision,
    }))
    .sort((a, b) => b.finalScore - a.finalScore);

  const candidateCount = new Set(analyses.map((analysis) => analysis.candidateId)).size;
  const averageScore = analyses.length
    ? Math.round(analyses.reduce((sum, analysis) => sum + analysis.finalScore, 0) / analyses.length)
    : 0;

  return { project, analyses, candidateCount, averageScore };
}

// The highest-scoring candidates for a project (analyses are already sorted
// by match in getProjectDetails). Empty when the project is missing.
export async function getTopCandidates(
  projectId: string,
  workspaceId: string,
  limit = 3,
): Promise<ProjectAnalysis[]> {
  const details = await getProjectDetails(projectId, workspaceId);
  if (!details) return [];
  return details.analyses.slice(0, limit);
}

export async function listCandidates(workspaceId: string): Promise<CandidateRow[]> {
  const db = getDb();
  if (!db) {
    return getMemoryStore()
      .candidates.filter((candidate) => candidate.workspaceId === workspaceId)
      .sort(byNewest);
  }
  return db
    .select()
    .from(candidates)
    .where(eq(candidates.workspaceId, workspaceId))
    .orderBy(desc(candidates.createdAt));
}

export async function getCandidate(
  id: string,
  workspaceId: string,
): Promise<CandidateRow | null> {
  const db = getDb();
  if (!db) {
    return (
      getMemoryStore().candidates.find(
        (candidate) => candidate.id === id && candidate.workspaceId === workspaceId,
      ) ?? null
    );
  }
  const rows = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), eq(candidates.workspaceId, workspaceId)))
    .limit(1);
  return rows[0] ?? null;
}

// Delete a candidate (and, via FK cascade, its analyses) within a workspace.
export async function deleteCandidate(id: string, workspaceId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    const memory = getMemoryStore();
    const candidate = memory.candidates.find(
      (row) => row.id === id && row.workspaceId === workspaceId,
    );
    if (!candidate) return false;
    memory.candidates = memory.candidates.filter((row) => row.id !== id);
    memory.analyses = memory.analyses.filter((row) => row.candidateId !== id);
    return true;
  }
  const rows = await db
    .delete(candidates)
    .where(and(eq(candidates.id, id), eq(candidates.workspaceId, workspaceId)))
    .returning({ id: candidates.id });
  return rows.length > 0;
}

// Create a candidate, or update the stored resume for an existing same-named one.
export async function upsertCandidate(input: UpsertCandidateInput): Promise<CandidateRow> {
  const parsedFields = {
    parsedHeadline: input.parsed?.headline ?? null,
    parsedSkills: input.parsed?.skills ?? null,
    parsedExperienceYears: input.parsed?.experienceYears ?? null,
    parsedWorkSummary: input.parsed?.workSummary ?? null,
    parsedViaFallback: input.parsedViaFallback ?? null,
  };

  const db = getDb();
  if (!db) {
    const memory = getMemoryStore();
    const existing = memory.candidates.find(
      (candidate) => candidate.name === input.name && candidate.workspaceId === input.workspaceId,
    );
    if (existing) {
      existing.resumeText = input.resumeText;
      existing.resumeEmbedding = input.resumeEmbedding ?? existing.resumeEmbedding;
      if (input.email !== undefined) existing.email = input.email ?? null;
      if (input.parsed) Object.assign(existing, parsedFields);
      return existing;
    }
    const candidate: CandidateRow = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      email: input.email ?? null,
      resumeText: input.resumeText,
      resumeEmbedding: input.resumeEmbedding ?? null,
      ...parsedFields,
      assignedReviewerId: null,
      assignedAt: null,
      createdAt: new Date(),
    };
    memory.candidates.unshift(candidate);
    return candidate;
  }

  const existing = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.name, input.name), eq(candidates.workspaceId, input.workspaceId)))
    .limit(1);

  if (existing[0]) {
    const rows = await db
      .update(candidates)
      .set({
        resumeText: input.resumeText,
        resumeEmbedding: input.resumeEmbedding ?? existing[0].resumeEmbedding,
        email: input.email ?? existing[0].email,
        ...(input.parsed ? parsedFields : {}),
      })
      .where(eq(candidates.id, existing[0].id))
      .returning();
    return rows[0];
  }

  const rows = await db
    .insert(candidates)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      email: input.email ?? null,
      resumeText: input.resumeText,
      resumeEmbedding: input.resumeEmbedding ?? null,
      ...parsedFields,
    })
    .returning();
  return rows[0];
}

// Analyses have no workspace column; they inherit isolation from their project.
export async function listAnalyses(workspaceId: string): Promise<AnalysisRow[]> {
  const db = getDb();
  if (!db) {
    const memory = getMemoryStore();
    const projectIds = new Set(
      memory.projects.filter((p) => p.workspaceId === workspaceId).map((p) => p.id),
    );
    return memory.analyses.filter((a) => projectIds.has(a.projectId)).sort(byNewest);
  }
  const rows = await db
    .select()
    .from(analyses)
    .innerJoin(projects, eq(analyses.projectId, projects.id))
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(analyses.createdAt));
  return rows.map((row) => row.analyses);
}

export async function listAnalysesByProject(projectId: string): Promise<AnalysisRow[]> {
  const db = getDb();
  if (!db) {
    return getMemoryStore()
      .analyses.filter((analysis) => analysis.projectId === projectId)
      .sort(byNewest);
  }
  return db
    .select()
    .from(analyses)
    .where(eq(analyses.projectId, projectId))
    .orderBy(desc(analyses.createdAt));
}

export async function listAnalysesByCandidate(candidateId: string): Promise<AnalysisRow[]> {
  const db = getDb();
  if (!db) {
    return getMemoryStore()
      .analyses.filter((analysis) => analysis.candidateId === candidateId)
      .sort(byNewest);
  }
  return db
    .select()
    .from(analyses)
    .where(eq(analyses.candidateId, candidateId))
    .orderBy(desc(analyses.createdAt));
}

export async function getAnalysis(id: string): Promise<AnalysisRow | null> {
  const db = getDb();
  if (!db) {
    return getMemoryStore().analyses.find((analysis) => analysis.id === id) ?? null;
  }
  const rows = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createAnalysis(input: NewAnalysisInput): Promise<AnalysisRow> {
  const db = getDb();
  if (!db) {
    const analysis: AnalysisRow = {
      id: randomUUID(),
      projectId: input.projectId,
      candidateId: input.candidateId,
      role: input.role,
      status: input.status ?? DEFAULT_CANDIDATE_STATUS,
      notes: "",
      similarityScore: input.similarityScore,
      llmScore: input.llmScore,
      finalScore: input.finalScore,
      rubricScores: input.rubricScores ?? null,
      evidence: input.evidence ?? null,
      strengths: input.strengths,
      gaps: input.gaps,
      interviewQuestions: input.interviewQuestions,
      aiSummary: null,
      technicalSummary: null,
      hiringRecommendation: null,
      interviewFocus: null,
      reviewStatus: "pending",
      reviewerNotes: null,
      adjustedFinalScore: null,
      automationDecision: input.automationDecision ?? null,
      createdAt: new Date(),
    };
    getMemoryStore().analyses.unshift(analysis);
    return analysis;
  }
  const rows = await db
    .insert(analyses)
    .values({
      projectId: input.projectId,
      candidateId: input.candidateId,
      role: input.role,
      similarityScore: input.similarityScore,
      llmScore: input.llmScore,
      finalScore: input.finalScore,
      rubricScores: input.rubricScores ?? null,
      evidence: input.evidence ?? null,
      strengths: input.strengths,
      gaps: input.gaps,
      interviewQuestions: input.interviewQuestions,
      ...(input.status ? { status: input.status } : {}),
      automationDecision: input.automationDecision ?? null,
    })
    .returning();
  return rows[0];
}

// Move a candidate to a new pipeline stage within its project.
export async function updateAnalysisStatus(
  id: string,
  status: CandidateStatus,
): Promise<AnalysisRow | null> {
  const db = getDb();
  if (!db) {
    const analysis = getMemoryStore().analyses.find((row) => row.id === id);
    if (!analysis) return null;
    analysis.status = status;
    return analysis;
  }
  const rows = await db
    .update(analyses)
    .set({ status })
    .where(eq(analyses.id, id))
    .returning();
  return rows[0] ?? null;
}

// Replace the recruiter notes for a candidate within its project.
export async function updateAnalysisNotes(
  id: string,
  notes: string,
): Promise<AnalysisRow | null> {
  const db = getDb();
  if (!db) {
    const analysis = getMemoryStore().analyses.find((row) => row.id === id);
    if (!analysis) return null;
    analysis.notes = notes;
    return analysis;
  }
  const rows = await db
    .update(analyses)
    .set({ notes })
    .where(eq(analyses.id, id))
    .returning();
  return rows[0] ?? null;
}

// Persist a generated AI briefing onto an analysis (Phase 10).
export async function updateAnalysisBriefing(
  id: string,
  briefing: Briefing,
): Promise<AnalysisRow | null> {
  const fields = {
    aiSummary: briefing.aiSummary,
    technicalSummary: briefing.technicalSummary,
    hiringRecommendation: briefing.hiringRecommendation,
    interviewFocus: briefing.interviewFocus,
  };
  const db = getDb();
  if (!db) {
    const analysis = getMemoryStore().analyses.find((row) => row.id === id);
    if (!analysis) return null;
    Object.assign(analysis, fields);
    return analysis;
  }
  const rows = await db.update(analyses).set(fields).where(eq(analyses.id, id)).returning();
  return rows[0] ?? null;
}

// Human-in-the-loop review update (Phase 18).
export interface AnalysisReviewInput {
  reviewStatus: ReviewStatus;
  adjustedFinalScore?: number | null;
  reviewerNotes?: string | null;
}

export async function updateAnalysisReview(
  id: string,
  input: AnalysisReviewInput,
): Promise<AnalysisRow | null> {
  const fields = {
    reviewStatus: input.reviewStatus,
    adjustedFinalScore: input.adjustedFinalScore ?? null,
    reviewerNotes: input.reviewerNotes ?? null,
  };
  const db = getDb();
  if (!db) {
    const analysis = getMemoryStore().analyses.find((row) => row.id === id);
    if (!analysis) return null;
    Object.assign(analysis, fields);
    return analysis;
  }
  const rows = await db.update(analyses).set(fields).where(eq(analyses.id, id)).returning();
  return rows[0] ?? null;
}

// Clear an automated decision so a recruiter override wins (Phase 20).
export async function clearAnalysisAutomation(id: string): Promise<AnalysisRow | null> {
  const db = getDb();
  if (!db) {
    const analysis = getMemoryStore().analyses.find((row) => row.id === id);
    if (!analysis) return null;
    analysis.automationDecision = null;
    return analysis;
  }
  const rows = await db
    .update(analyses)
    .set({ automationDecision: null })
    .where(eq(analyses.id, id))
    .returning();
  return rows[0] ?? null;
}

// Assign a reviewer (role) to a candidate within a workspace (Phase 19).
export async function assignReviewer(
  candidateId: string,
  workspaceId: string,
  reviewerId: string | null,
): Promise<CandidateRow | null> {
  const assignedAt = reviewerId ? new Date() : null;
  const db = getDb();
  if (!db) {
    const candidate = getMemoryStore().candidates.find(
      (row) => row.id === candidateId && row.workspaceId === workspaceId,
    );
    if (!candidate) return null;
    candidate.assignedReviewerId = reviewerId;
    candidate.assignedAt = assignedAt;
    return candidate;
  }
  const rows = await db
    .update(candidates)
    .set({ assignedReviewerId: reviewerId, assignedAt })
    .where(and(eq(candidates.id, candidateId), eq(candidates.workspaceId, workspaceId)))
    .returning();
  return rows[0] ?? null;
}

// Count candidates assigned to a given reviewer within a workspace (Phase 19).
export async function countAssignedCandidates(
  workspaceId: string,
  reviewerId: string,
): Promise<number> {
  const db = getDb();
  if (!db) {
    return getMemoryStore().candidates.filter(
      (row) => row.workspaceId === workspaceId && row.assignedReviewerId === reviewerId,
    ).length;
  }
  const rows = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      and(eq(candidates.workspaceId, workspaceId), eq(candidates.assignedReviewerId, reviewerId)),
    );
  return rows.length;
}

export interface NewAuditLogInput {
  workspaceId: string;
  actorRole: string;
  action: string;
  targetId?: string | null;
  targetName?: string | null;
}

// Append an immutable audit record (Phase 16). Never throws into the caller —
// audit failures must not break the underlying action.
export async function appendAuditLog(input: NewAuditLogInput): Promise<void> {
  const row: AuditLogRow = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    actorRole: input.actorRole,
    action: input.action,
    targetId: input.targetId ?? null,
    targetName: input.targetName ?? null,
    createdAt: new Date(),
  };
  const db = getDb();
  try {
    if (!db) {
      getMemoryStore().auditLogs.push(row);
      return;
    }
    await db.insert(auditLogs).values({
      id: row.id,
      workspaceId: row.workspaceId,
      actorRole: row.actorRole,
      action: row.action,
      targetId: row.targetId,
      targetName: row.targetName,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}

// The workspace's most recent audit records, newest first.
export async function listAuditLogs(workspaceId: string, limit = 15): Promise<AuditLogRow[]> {
  const db = getDb();
  if (!db) {
    return getMemoryStore()
      .auditLogs.filter((log) => log.workspaceId === workspaceId)
      .sort(byNewest)
      .slice(0, limit);
  }
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.workspaceId, workspaceId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

function byNewest(a: { createdAt: Date }, b: { createdAt: Date }): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

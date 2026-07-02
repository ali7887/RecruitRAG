import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getMemoryStore } from "@/lib/db/memory";
import {
  analyses,
  candidates,
  projects,
  type AnalysisRow,
  type CandidateRow,
  type ProjectRow,
} from "@/lib/db/schema";
import type { Briefing } from "@/lib/briefing";
import { DEFAULT_CANDIDATE_STATUS, type CandidateStatus } from "@/lib/constants";
import type { Evidence, RubricScores } from "@/lib/evaluation-rubric";

export interface NewProjectInput {
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
  name: string;
  email?: string | null;
  resumeText: string;
  resumeEmbedding?: number[] | null;
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
}

// True when analyses should persist to Postgres; false when using the
// in-memory demo fallback (no DATABASE_URL).
export function isPersistent(): boolean {
  return getDb() !== null;
}

export async function listProjects(): Promise<ProjectRow[]> {
  const db = getDb();
  if (!db) {
    return [...getMemoryStore().projects].sort(byNewest);
  }
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const db = getDb();
  if (!db) {
    return getMemoryStore().projects.find((project) => project.id === id) ?? null;
  }
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createProject(input: NewProjectInput): Promise<ProjectRow> {
  const db = getDb();
  if (!db) {
    const project: ProjectRow = {
      id: randomUUID(),
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
      title: input.title,
      description: input.description ?? "",
      requirements: input.requirements ?? "",
    })
    .returning();
  return rows[0];
}

// Projects with per-project metrics for the dashboard grid. Fetches all
// analyses once and groups in memory to avoid a query per project.
export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  const [allProjects, allAnalyses] = await Promise.all([listProjects(), listAnalyses()]);
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
export async function getProjectDetails(id: string): Promise<ProjectDetails | null> {
  const project = await getProject(id);
  if (!project) return null;

  const [rows, allCandidates] = await Promise.all([
    listAnalysesByProject(id),
    listCandidates(),
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
  limit = 3,
): Promise<ProjectAnalysis[]> {
  const details = await getProjectDetails(projectId);
  if (!details) return [];
  return details.analyses.slice(0, limit);
}

export async function listCandidates(): Promise<CandidateRow[]> {
  const db = getDb();
  if (!db) {
    return [...getMemoryStore().candidates].sort(byNewest);
  }
  return db.select().from(candidates).orderBy(desc(candidates.createdAt));
}

export async function getCandidate(id: string): Promise<CandidateRow | null> {
  const db = getDb();
  if (!db) {
    return getMemoryStore().candidates.find((candidate) => candidate.id === id) ?? null;
  }
  const rows = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
  return rows[0] ?? null;
}

// Create a candidate, or update the stored resume for an existing same-named one.
export async function upsertCandidate(input: UpsertCandidateInput): Promise<CandidateRow> {
  const db = getDb();
  if (!db) {
    const memory = getMemoryStore();
    const existing = memory.candidates.find((candidate) => candidate.name === input.name);
    if (existing) {
      existing.resumeText = input.resumeText;
      existing.resumeEmbedding = input.resumeEmbedding ?? existing.resumeEmbedding;
      if (input.email !== undefined) existing.email = input.email ?? null;
      return existing;
    }
    const candidate: CandidateRow = {
      id: randomUUID(),
      name: input.name,
      email: input.email ?? null,
      resumeText: input.resumeText,
      resumeEmbedding: input.resumeEmbedding ?? null,
      createdAt: new Date(),
    };
    memory.candidates.unshift(candidate);
    return candidate;
  }

  const existing = await db
    .select()
    .from(candidates)
    .where(eq(candidates.name, input.name))
    .limit(1);

  if (existing[0]) {
    const rows = await db
      .update(candidates)
      .set({
        resumeText: input.resumeText,
        resumeEmbedding: input.resumeEmbedding ?? existing[0].resumeEmbedding,
        email: input.email ?? existing[0].email,
      })
      .where(eq(candidates.id, existing[0].id))
      .returning();
    return rows[0];
  }

  const rows = await db
    .insert(candidates)
    .values({
      name: input.name,
      email: input.email ?? null,
      resumeText: input.resumeText,
      resumeEmbedding: input.resumeEmbedding ?? null,
    })
    .returning();
  return rows[0];
}

export async function listAnalyses(): Promise<AnalysisRow[]> {
  const db = getDb();
  if (!db) {
    return [...getMemoryStore().analyses].sort(byNewest);
  }
  return db.select().from(analyses).orderBy(desc(analyses.createdAt));
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
      status: DEFAULT_CANDIDATE_STATUS,
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

function byNewest(a: { createdAt: Date }, b: { createdAt: Date }): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

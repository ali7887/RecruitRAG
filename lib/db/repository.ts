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
import type { Evidence, RubricScores } from "@/lib/evaluation-rubric";

export interface NewProjectInput {
  title: string;
  description?: string;
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
      createdAt: new Date(),
    };
    getMemoryStore().projects.unshift(project);
    return project;
  }
  const rows = await db
    .insert(projects)
    .values({ title: input.title, description: input.description ?? "" })
    .returning();
  return rows[0];
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

export async function createAnalysis(input: NewAnalysisInput): Promise<AnalysisRow> {
  const db = getDb();
  if (!db) {
    const analysis: AnalysisRow = {
      id: randomUUID(),
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

function byNewest(a: { createdAt: Date }, b: { createdAt: Date }): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

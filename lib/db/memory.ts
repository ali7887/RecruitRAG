import { randomUUID } from "node:crypto";
import type { AnalysisRow, CandidateRow, ProjectRow } from "@/lib/db/schema";
import { getDemoAnalysisFor } from "@/lib/demo-analysis";
import { SAMPLE_JOB_DESCRIPTIONS, SAMPLE_RESUMES } from "@/lib/demo-content";

export interface MemoryStore {
  projects: ProjectRow[];
  candidates: CandidateRow[];
  analyses: AnalysisRow[];
}

let store: MemoryStore | null = null;

// Module-level singleton so seeded/added data survives across requests within a
// running server. Resets on cold start — acceptable for the demo fallback.
export function getMemoryStore(): MemoryStore {
  if (!store) {
    store = { projects: [], candidates: [], analyses: [] };
    seed(store);
  }
  return store;
}

function seed(target: MemoryStore) {
  const now = Date.now();

  // One candidate per sample resume; remember sampleId → generated uuid.
  const candidateIdBySample = new Map<string, string>();
  SAMPLE_RESUMES.forEach((resume, index) => {
    const id = randomUUID();
    candidateIdBySample.set(resume.id, id);
    target.candidates.push({
      id,
      name: resume.name,
      email: null,
      resumeText: resume.text,
      resumeEmbedding: null,
      createdAt: new Date(now - index * 1000),
    });
  });

  // One project per sample role, each with analyses for every candidate.
  const locations = ["Berlin", "Remote", "London"];
  SAMPLE_JOB_DESCRIPTIONS.forEach((role, index) => {
    const projectId = randomUUID();
    target.projects.push({
      id: projectId,
      title: `${role.short} Engineer — ${locations[index] ?? "Remote"}`,
      description: role.title,
      createdAt: new Date(now - index * 1000),
    });

    for (const resume of SAMPLE_RESUMES) {
      const candidateId = candidateIdBySample.get(resume.id);
      if (!candidateId) continue;
      const demo = getDemoAnalysisFor(resume.id, role.id);
      target.analyses.push({
        id: randomUUID(),
        projectId,
        candidateId,
        role: role.short,
        similarityScore: demo.similarityScore,
        llmScore: demo.llmScore,
        finalScore: demo.finalScore,
        rubricScores: demo.rubricScores ?? null,
        evidence: demo.evidence ?? null,
        strengths: demo.strengths,
        gaps: demo.gaps,
        interviewQuestions: demo.interviewQuestions,
        createdAt: new Date(now - index * 1000),
      });
    }
  });
}

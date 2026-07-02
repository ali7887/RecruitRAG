import { randomUUID } from "node:crypto";
import { getDemoBriefing } from "@/lib/briefing";
import { CANDIDATE_STATUSES } from "@/lib/constants";
import type { AnalysisRow, CandidateRow, ProjectRow } from "@/lib/db/schema";
import { getDemoAnalysisFor } from "@/lib/demo-analysis";
import { SAMPLE_JOB_DESCRIPTIONS, SAMPLE_RESUMES } from "@/lib/demo-content";

// One sample recruiter note per seeded candidate, so the notes UI looks alive.
const SEED_NOTES = [
  "Strong React/Next.js background — fast-track to screen.",
  "Solid full-stack; confirm infra and observability depth.",
  "Great RAG experience; needs follow-up on team collaboration.",
];

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

// The three demo projects. `roleId` drives deterministic demo scoring so each
// sample candidate tops exactly one board; `role` is the display label.
const SEED_PROJECTS: {
  title: string;
  description: string;
  requirements: string;
  role: string;
  roleId: string;
}[] = [
  {
    title: "Frontend Engineer (Next.js/TS)",
    description: SAMPLE_JOB_DESCRIPTIONS[0].title,
    requirements: "React, TypeScript, Next.js, Tailwind CSS, Accessibility",
    role: "Frontend",
    roleId: "frontend",
  },
  {
    title: "AI RAG specialist",
    description: SAMPLE_JOB_DESCRIPTIONS[2].title,
    requirements: "RAG, Embeddings, Vector search, LLM APIs, TypeScript",
    role: "AI Engineer",
    roleId: "ai",
  },
  {
    title: "DevOps / Infrastructure",
    description: "Own CI/CD, cloud infrastructure, and data reliability across services.",
    requirements: "CI/CD, PostgreSQL, Node.js, Cloud, Observability",
    role: "DevOps",
    roleId: "fullstack",
  },
];

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

  // One project per seed role, each with an analysis for every candidate
  // (3 projects × 3 candidates = 9 analyses).
  SEED_PROJECTS.forEach((seed, index) => {
    const projectId = randomUUID();
    target.projects.push({
      id: projectId,
      title: seed.title,
      description: seed.description,
      requirements: seed.requirements,
      createdAt: new Date(now - index * 1000),
    });

    SAMPLE_RESUMES.forEach((resume, candidateIndex) => {
      const candidateId = candidateIdBySample.get(resume.id);
      if (!candidateId) return;
      const demo = getDemoAnalysisFor(resume.id, seed.roleId);
      // Deterministic spread across pipeline stages so every status appears.
      const status = CANDIDATE_STATUSES[(index * 3 + candidateIndex) % CANDIDATE_STATUSES.length];
      const briefing = getDemoBriefing({
        name: resume.name,
        role: seed.role,
        finalScore: demo.finalScore,
        similarityScore: demo.similarityScore,
        llmScore: demo.llmScore,
        status,
        strengths: demo.strengths,
        gaps: demo.gaps,
        interviewQuestions: demo.interviewQuestions,
      });
      target.analyses.push({
        id: randomUUID(),
        projectId,
        candidateId,
        role: seed.role,
        status,
        notes: SEED_NOTES[candidateIndex] ?? "",
        similarityScore: demo.similarityScore,
        llmScore: demo.llmScore,
        finalScore: demo.finalScore,
        rubricScores: demo.rubricScores ?? null,
        evidence: demo.evidence ?? null,
        strengths: demo.strengths,
        gaps: demo.gaps,
        interviewQuestions: demo.interviewQuestions,
        aiSummary: briefing.aiSummary,
        technicalSummary: briefing.technicalSummary,
        hiringRecommendation: briefing.hiringRecommendation,
        interviewFocus: briefing.interviewFocus,
        createdAt: new Date(now - index * 1000),
      });
    });
  });
}

import { randomUUID } from "node:crypto";
import { getDemoBriefing } from "@/lib/briefing";
import { CANDIDATE_STATUSES } from "@/lib/constants";
import type { AnalysisRow, CandidateRow, ProjectRow, WorkspaceRow } from "@/lib/db/schema";
import { getDemoAnalysisFor } from "@/lib/demo-analysis";
import { SAMPLE_JOB_DESCRIPTIONS, SAMPLE_RESUMES } from "@/lib/demo-content";
import { getDemoParsedResume } from "@/lib/resume-parser";

// Seeded workspaces (mirror lib/workspace.ts DEMO_WORKSPACES).
const WS_STARTUP = "ws-startup";
const WS_AUTOMOTIVE = "ws-automotive";

// Which workspace each sample candidate belongs to.
const CANDIDATE_WORKSPACE: Record<string, string> = {
  amir: WS_STARTUP,
  leo: WS_STARTUP,
  sara: WS_AUTOMOTIVE,
};

// One sample recruiter note per seeded candidate, so the notes UI looks alive.
const SEED_NOTES = [
  "Strong React/Next.js background — fast-track to screen.",
  "Solid full-stack; confirm infra and observability depth.",
  "Great RAG experience; needs follow-up on team collaboration.",
];

export interface MemoryStore {
  workspaces: WorkspaceRow[];
  projects: ProjectRow[];
  candidates: CandidateRow[];
  analyses: AnalysisRow[];
}

let store: MemoryStore | null = null;

// Module-level singleton so seeded/added data survives across requests within a
// running server. Resets on cold start — acceptable for the demo fallback.
export function getMemoryStore(): MemoryStore {
  if (!store) {
    store = { workspaces: [], projects: [], candidates: [], analyses: [] };
    seed(store);
  }
  return store;
}

// Demo projects. `roleId` drives deterministic scoring; `workspaceId` isolates
// each project to a tenant.
const SEED_PROJECTS: {
  title: string;
  description: string;
  requirements: string;
  role: string;
  roleId: string;
  workspaceId: string;
}[] = [
  {
    title: "Frontend Engineer (Next.js/TS)",
    description: SAMPLE_JOB_DESCRIPTIONS[0].title,
    requirements: "React, TypeScript, Next.js, Tailwind CSS, Accessibility",
    role: "Frontend",
    roleId: "frontend",
    workspaceId: WS_STARTUP,
  },
  {
    title: "AI RAG specialist",
    description: SAMPLE_JOB_DESCRIPTIONS[2].title,
    requirements: "RAG, Embeddings, Vector search, LLM APIs, TypeScript",
    role: "AI Engineer",
    roleId: "ai",
    workspaceId: WS_STARTUP,
  },
  {
    title: "DevOps / Infrastructure",
    description: "Own CI/CD, cloud infrastructure, and data reliability across services.",
    requirements: "CI/CD, PostgreSQL, Node.js, Cloud, Observability",
    role: "DevOps",
    roleId: "fullstack",
    workspaceId: WS_AUTOMOTIVE,
  },
];

function seed(target: MemoryStore) {
  const now = Date.now();

  target.workspaces.push(
    { id: WS_STARTUP, name: "Tech Startup Hub", createdAt: new Date(now) },
    { id: WS_AUTOMOTIVE, name: "Automotive Tech GmbH", createdAt: new Date(now) },
  );

  // One candidate per sample resume, isolated to its workspace.
  const candidateIdBySample = new Map<string, string>();
  SAMPLE_RESUMES.forEach((resume, index) => {
    const id = randomUUID();
    candidateIdBySample.set(resume.id, id);
    const parsed = getDemoParsedResume(resume.text);
    target.candidates.push({
      id,
      workspaceId: CANDIDATE_WORKSPACE[resume.id] ?? WS_STARTUP,
      name: resume.name,
      email: null,
      resumeText: resume.text,
      resumeEmbedding: null,
      parsedHeadline: parsed.headline,
      parsedSkills: parsed.skills,
      parsedExperienceYears: parsed.experienceYears,
      parsedWorkSummary: parsed.workSummary,
      createdAt: new Date(now - index * 1000),
    });
  });

  // Each project gets an analysis only for candidates in the same workspace, so
  // tenants stay strictly isolated.
  SEED_PROJECTS.forEach((seed, index) => {
    const projectId = randomUUID();
    target.projects.push({
      id: projectId,
      workspaceId: seed.workspaceId,
      title: seed.title,
      description: seed.description,
      requirements: seed.requirements,
      createdAt: new Date(now - index * 1000),
    });

    SAMPLE_RESUMES.forEach((resume, candidateIndex) => {
      if ((CANDIDATE_WORKSPACE[resume.id] ?? WS_STARTUP) !== seed.workspaceId) return;
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

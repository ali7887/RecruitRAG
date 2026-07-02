import { NextResponse } from "next/server";
import { analyzeResume } from "@/lib/analysis-engine";
import { evaluateAutomation } from "@/lib/automation";
import { getDemoAnalysisFor } from "@/lib/demo-analysis";
import {
  appendAuditLog,
  createAnalysis,
  getCandidate,
  getProject,
  listProjects,
  listWorkspaces,
} from "@/lib/db/repository";
import { env } from "@/lib/env";
import type { EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { validateSignature } from "@/lib/hmac";

export const dynamic = "force-dynamic";

const MIN_JD_LENGTH = 30;

// POST /api/external/analyze — analyze a stored candidate against a project.
// Body: { candidateId, workspaceId, projectId? }. Falls back to the first
// project in the workspace when projectId is omitted. HMAC-signed over the body.
export async function POST(request: Request) {
  const raw = await request.text();
  if (!validateSignature(raw, request.headers.get("x-rag-signature"))) {
    return NextResponse.json({ error: "Invalid or missing signature" }, { status: 401 });
  }

  let body: { candidateId?: string; workspaceId?: string; projectId?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { candidateId, workspaceId, projectId } = body;
  if (!candidateId || !workspaceId) {
    return NextResponse.json({ error: "candidateId and workspaceId are required" }, { status: 400 });
  }

  const workspaces = await listWorkspaces();
  if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
    return NextResponse.json({ error: "Unknown workspaceId" }, { status: 403 });
  }

  const candidate = await getCandidate(candidateId, workspaceId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found in workspace" }, { status: 404 });
  }

  const project = projectId
    ? await getProject(projectId, workspaceId)
    : (await listProjects(workspaceId))[0];
  if (!project) {
    return NextResponse.json({ error: "No project available to analyze against" }, { status: 400 });
  }

  const role = project.title.split("—")[0].trim() || project.title;

  let analysis: EvaluatedAnalysis;
  if (env.useDemoMode || project.description.length <= MIN_JD_LENGTH) {
    analysis = getDemoAnalysisFor(candidate.name, role);
  } else {
    try {
      const engine = await analyzeResume(candidate.resumeText || candidate.name, project.description);
      analysis = engine.analysis;
    } catch {
      analysis = getDemoAnalysisFor(candidate.name, role);
    }
  }

  const automation = evaluateAutomation({
    finalScore: analysis.finalScore,
    rubricScores: analysis.rubricScores ?? null,
    evidence: analysis.evidence ?? null,
  });

  const created = await createAnalysis({
    projectId: project.id,
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
    status: automation.status ?? undefined,
    automationDecision: automation.decision,
  });

  await appendAuditLog({
    workspaceId,
    actorRole: "Owner",
    action: "API_ANALYSIS_RUN",
    targetId: candidate.id,
    targetName: candidate.name,
  });

  return NextResponse.json({
    analysisId: created.id,
    projectId: project.id,
    finalScore: created.finalScore,
    status: created.status,
    automationDecision: created.automationDecision,
  });
}

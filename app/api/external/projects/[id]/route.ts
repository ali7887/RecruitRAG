import { NextResponse } from "next/server";
import { getProjectDetails } from "@/lib/db/repository";
import { validateSignature } from "@/lib/hmac";
import { effectiveScore } from "@/lib/multi";

export const dynamic = "force-dynamic";

// GET /api/external/projects/[id]?workspaceId=... — project summary + candidate
// rankings. HMAC-signed over the string "<id>:<workspaceId>".
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }
  if (!validateSignature(`${id}:${workspaceId}`, request.headers.get("x-rag-signature"))) {
    return NextResponse.json({ error: "Invalid or missing signature" }, { status: 401 });
  }

  const details = await getProjectDetails(id, workspaceId);
  if (!details) {
    return NextResponse.json({ error: "Project not found in workspace" }, { status: 404 });
  }

  const rankings = details.analyses.map((analysis) => ({
    candidateId: analysis.candidateId,
    name: analysis.name,
    score: effectiveScore(analysis.finalScore, analysis.reviewStatus, analysis.adjustedFinalScore),
    status: analysis.status,
    automationDecision: analysis.automationDecision,
  }));

  return NextResponse.json({
    id: details.project.id,
    title: details.project.title,
    requirements: details.project.requirements,
    candidateCount: details.candidateCount,
    averageScore: details.averageScore,
    rankings,
  });
}

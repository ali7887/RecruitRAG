import { NextResponse } from "next/server";
import { appendAuditLog, listWorkspaces, upsertCandidate } from "@/lib/db/repository";
import { validateSignature } from "@/lib/hmac";
import { getDemoParsedResume, normalizeResumeText } from "@/lib/resume-parser";

export const dynamic = "force-dynamic";

// POST /api/external/candidates — create a candidate from an external ATS/CRM.
// Body: { name, resumeText, workspaceId }. HMAC-signed over the raw body.
export async function POST(request: Request) {
  const raw = await request.text();
  if (!validateSignature(raw, request.headers.get("x-rag-signature"))) {
    return NextResponse.json({ error: "Invalid or missing signature" }, { status: 401 });
  }

  let body: { name?: string; resumeText?: string; workspaceId?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, resumeText, workspaceId } = body;
  if (!name || !workspaceId) {
    return NextResponse.json({ error: "name and workspaceId are required" }, { status: 400 });
  }

  const workspaces = await listWorkspaces();
  if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
    return NextResponse.json({ error: "Unknown workspaceId" }, { status: 403 });
  }

  const normalized = normalizeResumeText(resumeText ?? "");
  const candidate = await upsertCandidate({
    workspaceId,
    name,
    resumeText: normalized,
    parsed: getDemoParsedResume(normalized || name),
  });

  await appendAuditLog({
    workspaceId,
    actorRole: "Owner",
    action: "API_CANDIDATE_CREATE",
    targetId: candidate.id,
    targetName: candidate.name,
  });

  return NextResponse.json({ id: candidate.id, name: candidate.name }, { status: 201 });
}

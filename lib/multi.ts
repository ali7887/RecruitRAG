import type { EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { getDemoAnalysisFor } from "@/lib/demo-analysis";

export type AnalysisMode = "single" | "candidates" | "roles" | "matrix";

export interface Candidate {
  id: string;
  name: string;
  file: File | null; // null = sample candidate (scored via deterministic demo)
}

export interface Role {
  id: string;
  title: string;
  short: string;
  text: string;
}

// Stable key for a (candidate, role) result cell.
export function cellKey(candidateId: string, roleId: string): string {
  return `${candidateId}::${roleId}`;
}

// Client-only id for uploaded candidates (never called during render → no
// hydration concerns).
export function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// Score → accent color class, shared by the ring, badges, and matrix cells.
export function scoreColorClass(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-cyan-400";
  if (score >= 55) return "text-amber-400";
  return "text-red-400";
}

// Analyze one candidate against one role. Deterministic demo output is used
// when the candidate has no uploaded file or demo mode is on; otherwise the
// existing /api/analyze endpoint is invoked (contract unchanged).
export async function analyzeCell(
  candidate: Candidate,
  role: Role,
  demo: boolean,
): Promise<EvaluatedAnalysis> {
  if (demo || candidate.file === null) {
    return getDemoAnalysisFor(candidate.id, role.id);
  }

  const formData = new FormData();
  formData.append("file", candidate.file);
  formData.append("jobDescription", role.text);

  const response = await fetch("/api/analyze", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Analysis failed.");
  }
  return data as EvaluatedAnalysis;
}

import type { ProjectAnalysis, ProjectDetails } from "@/lib/db/repository";

// A downloadable file produced by an export action.
export interface ExportFile {
  filename: string;
  mime: string;
  content: string;
}

// Filesystem-safe slug for filenames, e.g. "Frontend Engineer" → "frontend-engineer".
function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

// Render a bullet list, or an em dash when empty, so headings never dangle.
function bullets(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "—";
}

// Full project report as Markdown: metadata, metrics, a candidates table, and
// per-candidate strengths / gaps / notes. Deterministic (follows match order).
export function buildProjectMarkdown(details: ProjectDetails): ExportFile {
  const { project, analyses, candidateCount, averageScore } = details;

  const table = [
    "| Name | Score | Status |",
    "| --- | --- | --- |",
    ...analyses.map((a) => `| ${a.name} | ${a.finalScore} | ${a.status} |`),
  ].join("\n");

  const detailSections = analyses
    .map((a) =>
      [
        `### ${a.name} — ${a.finalScore} (${a.status})`,
        "",
        "**Strengths**",
        bullets(a.strengths),
        "",
        "**Gaps**",
        bullets(a.gaps),
        "",
        "**Notes**",
        a.notes.trim() || "—",
      ].join("\n"),
    )
    .join("\n\n");

  const content = [
    `# ${project.title}`,
    "",
    project.description.trim() || "_No description._",
    "",
    `**Requirements:** ${project.requirements.trim() || "—"}`,
    "",
    "## Summary",
    `- Candidates: ${candidateCount}`,
    `- Average match: ${averageScore}`,
    "",
    "## Candidates",
    table,
    "",
    "## Candidate Details",
    detailSections || "_No candidates yet._",
    "",
  ].join("\n");

  return {
    filename: `${slug(project.title)}-report.md`,
    mime: "text/markdown",
    content,
  };
}

// ATS-ready JSON: flat, schema-free, only the fields recruiters need.
export function buildProjectJSON(details: ProjectDetails): ExportFile {
  const { project, analyses } = details;

  const payload = {
    id: project.id,
    title: project.title,
    requirements: project.requirements,
    candidates: analyses.map((a) => ({
      id: a.candidateId,
      name: a.name,
      status: a.status,
      finalScore: a.finalScore,
      notes: a.notes,
      strengths: a.strengths,
      gaps: a.gaps,
    })),
  };

  return {
    filename: `${slug(project.title)}-report.json`,
    mime: "application/json",
    content: `${JSON.stringify(payload, null, 2)}\n`,
  };
}

// Short, HR-friendly plain-text summary of the top candidates. No LLM call.
export function buildProjectSummary(
  details: ProjectDetails,
  top: ProjectAnalysis[],
): ExportFile {
  const { project, candidateCount, averageScore } = details;

  const lines = top.map((a, index) => {
    const highlight = a.notes.trim() || a.strengths[0] || "No notes yet.";
    return `${index + 1}. ${a.name} — ${a.finalScore}/100 (${a.status}). ${highlight}`;
  });

  const content = [
    `${project.title} — Candidate Summary`,
    "",
    `${candidateCount} candidate${candidateCount === 1 ? "" : "s"} evaluated, average match ${averageScore}/100.`,
    "",
    top.length ? "Top candidates:" : "No candidates yet.",
    ...lines,
    "",
  ].join("\n");

  return {
    filename: `${slug(project.title)}-summary.txt`,
    mime: "text/plain",
    content,
  };
}

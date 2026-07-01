"use client";

import {
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { Loader2, Upload } from "lucide-react";
import { AnalysisAnimation } from "@/components/analysis-animation";
import { AnalysisResultView, MultiResultList } from "@/components/analysis-result";
import { CandidateBadge } from "@/components/candidate-badge";
import { MultiAnalysisTable } from "@/components/multi-analysis-table";
import { ProcessingStats, type ProcessingMetadata } from "@/components/processing-stats";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_JOB_DESCRIPTIONS, SAMPLE_RESUMES } from "@/lib/demo-content";
import type { EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import {
  analyzeCell,
  cellKey,
  makeId,
  type AnalysisMode,
  type Candidate,
  type Role,
} from "@/lib/multi";
import { cn } from "@/lib/utils";

const MIN_JOB_DESCRIPTION_LENGTH = 30;

const MODES: { id: AnalysisMode; label: string }[] = [
  { id: "single", label: "Single" },
  { id: "candidates", label: "Candidates" },
  { id: "roles", label: "Roles" },
  { id: "matrix", label: "Matrix" },
];

export function Dashboard({ demoMode = false }: { demoMode?: boolean }) {
  const [mode, setMode] = useState<AnalysisMode>("single");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    SAMPLE_JOB_DESCRIPTIONS.map((role) => role.id),
  );
  const [results, setResults] = useState<Record<string, EvaluatedAnalysis>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ProcessingMetadata | null>(null);

  const usesCandidateStack = mode === "candidates" || mode === "matrix";
  const usesCustomRole = mode === "single" || mode === "candidates";

  const effectiveCandidates = usesCandidateStack ? candidates : candidates.slice(0, 1);
  const customRole: Role = {
    id: "custom",
    title: "Job Description",
    short: "JD",
    text: jobDescription,
  };
  const effectiveRoles: Role[] = usesCustomRole
    ? [customRole]
    : SAMPLE_JOB_DESCRIPTIONS.filter((role) => selectedRoleIds.includes(role.id)).map((role) => ({
        id: role.id,
        title: role.title,
        short: role.short,
        text: role.text,
      }));

  const rolesReady = usesCustomRole
    ? jobDescription.trim().length > MIN_JOB_DESCRIPTION_LENGTH
    : effectiveRoles.length > 0;
  const canAnalyze = effectiveCandidates.length > 0 && rolesReady && !isSubmitting;

  function changeMode(next: AnalysisMode) {
    setMode(next);
    setResults({});
    setMetadata(null);
    setError(null);
  }

  function addFiles(files: File[]) {
    const pdfs = files.filter((file) => file.type === "application/pdf");
    if (pdfs.length === 0) {
      setError("Please upload PDF files only.");
      return;
    }
    setError(null);
    const next = pdfs.map<Candidate>((file) => ({ id: makeId("cand"), name: file.name, file }));
    setCandidates((prev) => (usesCandidateStack ? [...prev, ...next] : next.slice(0, 1)));
  }

  function addSampleCandidates() {
    setError(null);
    if (usesCandidateStack) {
      setCandidates((prev) => {
        const existing = new Set(prev.map((candidate) => candidate.id));
        const additions = SAMPLE_RESUMES.filter((resume) => !existing.has(resume.id)).map<Candidate>(
          (resume) => ({ id: resume.id, name: resume.name, file: null }),
        );
        return [...prev, ...additions];
      });
    } else {
      const sample = SAMPLE_RESUMES[0];
      setCandidates([{ id: sample.id, name: sample.name, file: null }]);
    }
  }

  function removeCandidate(id: string) {
    setCandidates((prev) => prev.filter((candidate) => candidate.id !== id));
  }

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((roleId) => roleId !== id) : [...prev, id],
    );
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isSubmitting) return;
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function runAnalyses(cands: Candidate[], roles: Role[]) {
    if (isSubmitting) return;
    if (cands.length === 0) {
      setError("Add at least one candidate.");
      return;
    }
    if (roles.length === 0 || roles.some((role) => role.text.trim().length <= MIN_JOB_DESCRIPTION_LENGTH)) {
      setError(`Add a job description, or click "Use sample JD".`);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setResults({});
    setMetadata(null);

    const startedAt = performance.now();
    const pairs = cands.flatMap((candidate) => roles.map((role) => ({ candidate, role })));

    try {
      const entries = await Promise.all(
        pairs.map(
          async ({ candidate, role }) =>
            [cellKey(candidate.id, role.id), await analyzeCell(candidate, role, demoMode)] as const,
        ),
      );
      setResults(Object.fromEntries(entries));
      const chars = cands.length * roles.reduce((sum, role) => sum + role.text.length, 0);
      setMetadata({
        processingTimeMs: Math.round(performance.now() - startedAt),
        estimatedTokens: Math.max(320, Math.round(chars / 4)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAnalyze() {
    void runAnalyses(effectiveCandidates, effectiveRoles);
  }

  // Load a deterministic demo appropriate to the current mode, then analyze.
  function loadDemo() {
    if (isSubmitting) return;
    const cands: Candidate[] = usesCandidateStack
      ? SAMPLE_RESUMES.map((resume) => ({ id: resume.id, name: resume.name, file: null }))
      : [{ id: SAMPLE_RESUMES[0].id, name: SAMPLE_RESUMES[0].name, file: null }];

    let roles: Role[];
    if (usesCustomRole) {
      setJobDescription(SAMPLE_JOB_DESCRIPTION);
      roles = [{ id: "custom", title: "Job Description", short: "JD", text: SAMPLE_JOB_DESCRIPTION }];
    } else {
      setSelectedRoleIds(SAMPLE_JOB_DESCRIPTIONS.map((role) => role.id));
      roles = SAMPLE_JOB_DESCRIPTIONS.map((role) => ({
        id: role.id,
        title: role.title,
        short: role.short,
        text: role.text,
      }));
    }

    setCandidates(cands);
    void runAnalyses(cands, roles);
  }

  return (
    <div className="mt-5 flex flex-1 flex-col gap-4 lg:min-h-0">
      {/* Mode selector */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-0.5">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changeMode(item.id)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                mode === item.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {demoMode && (
          <span
            title="Using a deterministic demo analysis. Connect API keys for live analysis."
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
          >
            <span className="size-1 rounded-full bg-emerald-400" />
            Demo Mode
          </span>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:min-h-0 lg:grid-cols-[3fr_4fr_3fr]">
        {/* LEFT — inputs */}
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg shadow-black/30 backdrop-blur lg:min-h-0 lg:overflow-y-auto">
          {/* Candidates */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                {usesCandidateStack ? "Candidates" : "Resume"}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addSampleCandidates}
                  disabled={isSubmitting}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  {usesCandidateStack ? "Add samples" : "Use sample"}
                </Button>
                <label className="cursor-pointer rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100">
                  Upload
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple={usesCandidateStack}
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
            </div>

            {usesCandidateStack ? (
              <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
                {candidates.length === 0 ? (
                  <DropZone isDragging={isDragging} setIsDragging={setIsDragging} onDrop={handleDrop}>
                    Drop resumes, click Upload, or add samples
                  </DropZone>
                ) : (
                  candidates.map((candidate) => (
                    <CandidateBadge
                      key={candidate.id}
                      name={candidate.name}
                      score={results[cellKey(candidate.id, effectiveRoles[0]?.id ?? "")]?.finalScore}
                      onRemove={() => removeCandidate(candidate.id)}
                      disabled={isSubmitting}
                    />
                  ))
                )}
              </div>
            ) : candidates[0] ? (
              <CandidateBadge
                name={candidates[0].name}
                score={results[cellKey(candidates[0].id, effectiveRoles[0]?.id ?? "")]?.finalScore}
                onRemove={() => removeCandidate(candidates[0].id)}
                disabled={isSubmitting}
              />
            ) : (
              <DropZone isDragging={isDragging} setIsDragging={setIsDragging} onDrop={handleDrop}>
                Drop a resume, click Upload, or use a sample
              </DropZone>
            )}
          </div>

          {/* Roles */}
          {usesCustomRole ? (
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Role
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setJobDescription(SAMPLE_JOB_DESCRIPTION)}
                  disabled={isSubmitting}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  Use sample JD
                </Button>
                {jobDescription.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setJobDescription("")}
                    disabled={isSubmitting}
                    className="text-zinc-500 hover:text-zinc-200"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                disabled={isSubmitting}
                rows={4}
                placeholder="Paste the job description here…"
                className="max-h-56 min-h-24 flex-1 resize-none overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Roles
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_JOB_DESCRIPTIONS.map((role) => (
                  <RoleBadge
                    key={role.id}
                    title={role.short}
                    selected={selectedRoleIds.includes(role.id)}
                    onToggle={() => toggleRole(role.id)}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="h-11 flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing…
                  </>
                ) : mode === "single" ? (
                  "Analyze"
                ) : (
                  "Analyze All"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={loadDemo}
                disabled={isSubmitting}
                className="h-11 rounded-xl"
              >
                Try demo
              </Button>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3"
              >
                <p className="text-sm font-medium text-red-200">Analysis unavailable</p>
                <p className="mt-1 text-sm text-red-300/80">{error}</p>
                {error.toLowerCase().includes("quota") && (
                  <p className="mt-2 text-xs text-red-300/60">
                    Enable billing in the OpenAI Platform, or set USE_DEMO_MODE=true.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — persistent pipeline */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5 lg:min-h-0">
          <AnalysisAnimation mode={isSubmitting ? "active" : "idle"} />
          {metadata && <ProcessingStats metadata={metadata} />}
        </div>

        {/* RIGHT — results */}
        <div className="lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <Results
            mode={mode}
            candidates={effectiveCandidates}
            roles={effectiveRoles}
            results={results}
          />
        </div>
      </div>
    </div>
  );
}

function DropZone({
  isDragging,
  setIsDragging,
  onDrop,
  children,
}: {
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border border-dashed p-5 text-center transition-colors",
        isDragging
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-zinc-700 bg-zinc-950/40",
      )}
    >
      <Upload className="size-4 text-zinc-500" />
      <span className="text-xs text-zinc-500">{children}</span>
    </div>
  );
}

function Results({
  mode,
  candidates,
  roles,
  results,
}: {
  mode: AnalysisMode;
  candidates: Candidate[];
  roles: Role[];
  results: Record<string, EvaluatedAnalysis>;
}) {
  if (mode === "matrix") {
    const hasAny = candidates.length > 0 && roles.length > 0;
    return hasAny ? (
      <MultiAnalysisTable candidates={candidates} roles={roles} results={results} />
    ) : (
      <EmptyResults />
    );
  }

  if (mode === "single") {
    const candidate = candidates[0];
    const result = candidate ? results[cellKey(candidate.id, roles[0]?.id ?? "")] : undefined;
    return result ? <AnalysisResultView result={result} /> : <EmptyResults />;
  }

  // candidates or roles: ranked list of compact cards.
  const items =
    mode === "candidates"
      ? candidates.map((candidate) => ({
          key: candidate.id,
          label: candidate.name,
          result: results[cellKey(candidate.id, roles[0]?.id ?? "")],
        }))
      : roles.map((role) => ({
          key: role.id,
          label: role.title,
          result: candidates[0] ? results[cellKey(candidates[0].id, role.id)] : undefined,
        }));

  const ready = items.filter(
    (item): item is { key: string; label: string; result: EvaluatedAnalysis } =>
      item.result !== undefined,
  );

  return ready.length > 0 ? <MultiResultList items={ready} /> : <EmptyResults />;
}

function EmptyResults() {
  return (
    <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">
      Add candidates and a role, then run the analysis to see results here.
    </div>
  );
}

"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { AnalysisAnimation } from "@/components/analysis-animation";
import { AnalysisResultView } from "@/components/analysis-result";
import { ProcessingStats, type ProcessingMetadata } from "@/components/processing-stats";
import { Button } from "@/components/ui/button";
import { getDemoAnalysisResult } from "@/lib/demo-analysis";
import { SAMPLE_JOB_DESCRIPTION } from "@/lib/demo-content";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/types";

const MIN_JOB_DESCRIPTION_LENGTH = 30;

function validatePdf(file: File): string | null {
  return file.type === "application/pdf" ? null : "Please upload a PDF file.";
}

// Single-viewport horizontal dashboard: form (left) · pipeline (center) ·
// results (right). All shared state lives here so the columns stay in sync.
// `demoMode` reflects the server's USE_DEMO_MODE flag (passed from the page).
export function Dashboard({ demoMode = false }: { demoMode?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [metadata, setMetadata] = useState<ProcessingMetadata | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit: boolean =
    file !== null &&
    jobDescription.trim().length > MIN_JOB_DESCRIPTION_LENGTH &&
    !isSubmitting;

  function selectFile(next: File | null) {
    if (!next) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const validationError = validatePdf(next);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isSubmitting) setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isSubmitting) return;
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  function handleJobDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setJobDescription(event.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  async function submit() {
    if (isSubmitting) return; // prevent double submission
    if (!file) {
      setError("Please add a PDF resume.");
      return;
    }
    const fileError = validatePdf(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    if (jobDescription.trim().length <= MIN_JOB_DESCRIPTION_LENGTH) {
      setError(`Add a job description, or click "Use sample JD" to try one.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setResult(null);
    setMetadata(null);

    const startedAt = performance.now();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Analysis failed.");
      }
      setResult(data as AnalysisResult);
      // Client-derived metadata (the API contract is unchanged): real round-trip
      // time plus a rough token estimate (~4 chars/token) of analyzed content.
      setMetadata({
        processingTimeMs: Math.round(performance.now() - startedAt),
        estimatedTokens: Math.round(
          (jobDescription.length + JSON.stringify(data).length) / 4,
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  function useSampleJd() {
    setError(null);
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
  }

  function clearJd() {
    setJobDescription("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  // Instant, deterministic demo result — no file, API keys, or quota needed.
  // Briefly runs the active animation for a realistic feel.
  function loadDemoAnalysis() {
    if (isSubmitting) return;
    setError(null);
    setResult(null);
    setMetadata(null);
    setIsSubmitting(true);

    const startedAt = performance.now();
    window.setTimeout(() => {
      setResult(getDemoAnalysisResult());
      setMetadata({
        processingTimeMs: Math.round(performance.now() - startedAt),
        estimatedTokens: Math.max(320, Math.round(jobDescription.length / 4)),
      });
      setIsSubmitting(false);
    }, 1400);
  }

  return (
    <div className="mt-6 grid flex-1 grid-cols-1 gap-6 lg:min-h-0 lg:grid-cols-[3fr_4fr_3fr]">
      {/* LEFT — Upload + job description */}
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg shadow-black/30 backdrop-blur lg:min-h-0 lg:overflow-y-auto"
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "rounded-2xl border border-dashed p-6 text-center transition-colors",
            isDragging
              ? "border-emerald-500/60 bg-emerald-500/5"
              : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-600",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />

          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-200">
              <FileText className="size-4 shrink-0 text-emerald-400" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => selectFile(null)}
                disabled={isSubmitting}
                aria-label="Remove file"
                className="rounded-md p-1 text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isSubmitting}
              className="flex w-full flex-col items-center gap-2 disabled:opacity-50"
            >
              <Upload className="size-5 text-zinc-500" />
              <span className="text-sm text-zinc-300">Drop resume, or click to upload</span>
              <span className="text-xs text-zinc-600">PDF only</span>
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={useSampleJd}
              disabled={isSubmitting}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Use sample JD
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadDemoAnalysis}
              disabled={isSubmitting}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Try demo
            </Button>
            {jobDescription.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearJd}
                disabled={isSubmitting}
                className="text-zinc-500 hover:text-zinc-200"
              >
                Clear
              </Button>
            )}
            {demoMode && (
              <span
                title="Using a deterministic demo analysis. Connect API keys for live analysis."
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
              >
                <span className="size-1 rounded-full bg-emerald-400" />
                Demo Mode
              </span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={jobDescription}
            onChange={handleJobDescriptionChange}
            disabled={isSubmitting}
            rows={4}
            placeholder="Paste the job description here…"
            className="max-h-64 min-h-28 flex-1 resize-none overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <span className="px-1 text-right text-xs text-zinc-600">
            {jobDescription.trim().length} chars · min {MIN_JOB_DESCRIPTION_LENGTH + 1}
          </span>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-11 shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            "Analyze Resume"
          )}
        </Button>

        {error && (
          <div
            role="alert"
            className="shrink-0 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3"
          >
            <p className="text-sm font-medium text-red-200">Analysis unavailable</p>
            <p className="mt-1 text-sm text-red-300/80">{error}</p>
            {error.toLowerCase().includes("quota") && (
              <p className="mt-2 text-xs text-red-300/60">
                Enable billing in the OpenAI Platform, or set USE_DEMO_MODE=true for
                local demos.
              </p>
            )}
          </div>
        )}
      </form>

      {/* CENTER — Persistent AI pipeline animation + stats */}
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5 lg:min-h-0">
        <AnalysisAnimation mode={isSubmitting ? "active" : "idle"} />
        {metadata && <ProcessingStats metadata={metadata} />}
      </div>

      {/* RIGHT — Score + results */}
      <div className="lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        {result ? (
          <AnalysisResultView result={result} />
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">
            Your match score, strengths, gaps, and interview questions will appear here
            after analysis.
          </div>
        )}
      </div>
    </div>
  );
}

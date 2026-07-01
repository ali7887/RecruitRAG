"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { AnalysisResultView } from "@/components/analysis-result";
import { AnalysisSkeleton } from "@/components/ui/analysis-skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/types";

const MIN_JOB_DESCRIPTION_LENGTH = 30;

function validatePdf(file: File): string | null {
  return file.type === "application/pdf" ? null : "Please upload a PDF file.";
}

export function UploadForm() {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Defer interactive UI to the client to avoid SSR/client attribute mismatch.
  useEffect(() => {
    setMounted(true);
  }, []);

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
      setError(`Job description must be longer than ${MIN_JOB_DESCRIPTION_LENGTH} characters.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setResult(null);

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

  // Static, non-interactive shell rendered before mount for deterministic SSR.
  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg shadow-black/30">
        <div className="h-44 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg shadow-black/30"
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "rounded-2xl border border-dashed p-8 text-center transition-colors",
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
            <div className="flex items-center justify-center gap-3 text-sm text-zinc-200">
              <FileText className="size-4 text-emerald-400" />
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
              <span className="text-sm text-zinc-300">
                Drop your resume here, or click to upload
              </span>
              <span className="text-xs text-zinc-600">PDF only</span>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <textarea
            ref={textareaRef}
            value={jobDescription}
            onChange={handleJobDescriptionChange}
            disabled={isSubmitting}
            rows={5}
            placeholder="Paste the job description here…"
            className="max-h-80 min-h-32 resize-none overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <span className="px-1 text-right text-xs text-zinc-600">
            {jobDescription.trim().length} characters · min {MIN_JOB_DESCRIPTION_LENGTH + 1}
          </span>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3"
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

      {isSubmitting ? (
        <AnalysisSkeleton />
      ) : result ? (
        <AnalysisResultView result={result} />
      ) : null}
    </div>
  );
}

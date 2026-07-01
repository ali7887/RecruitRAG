import { analyzeResume } from "@/lib/analysis-engine";
import { getDemoAnalysisResult } from "@/lib/demo-analysis";
import { QuotaExceededError } from "@/lib/embeddings";
import { env } from "@/lib/env";
import { extractTextFromPdf } from "@/lib/parser";

// pdf-parse and prompt-file reads rely on Node APIs.
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Expected multipart/form-data.", 400);
  }

  const file = form.get("file");
  const jobDescription = form.get("jobDescription");

  if (!(file instanceof File) || file.size === 0) {
    return errorResponse("A resume PDF file is required.", 400);
  }
  if (file.type !== "application/pdf") {
    return errorResponse("The resume must be a PDF file.", 400);
  }
  if (typeof jobDescription !== "string" || jobDescription.trim().length === 0) {
    return errorResponse("A job description is required.", 400);
  }

  // Demo mode: explicit opt-in only. Skip all external providers and return a
  // static analysis, with a small delay to preserve realistic UX.
  if (env.useDemoMode) {
    await sleep(800 + Math.floor(Math.random() * 400));
    return Response.json(getDemoAnalysisResult());
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractTextFromPdf(buffer);
    const { analysis } = await analyzeResume(resumeText, jobDescription);
    return Response.json(analysis);
  } catch (error) {
    if (error instanceof Error && error.message === "PDF contains no readable text") {
      return errorResponse("PDF contains no readable text", 400);
    }
    if (error instanceof QuotaExceededError) {
      // Log full detail server-side; return a clean, actionable message.
      console.error("Analysis failed (quota):", error);
      return errorResponse(error.message, 429);
    }
    console.error("Analysis failed:", error);
    return errorResponse("Failed to analyze the resume.", 500);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

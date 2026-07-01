// Import the library implementation directly. pdf-parse@1.1.1's index.js has a
// debug block that reads a bundled test PDF at module load (when module.parent
// is undefined under bundlers), which crashes the build; lib/pdf-parse.js skips it.
import pdf from "pdf-parse/lib/pdf-parse.js";

// Extract plain text from an uploaded PDF (server-only).
// Uses pdf-parse@1.1.1, which runs purely in Node with no pdfjs worker.
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  const text = data.text?.trim() ?? "";
  if (text.length === 0) {
    throw new Error("PDF contains no readable text");
  }
  return text;
}

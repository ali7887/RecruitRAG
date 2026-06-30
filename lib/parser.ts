import { PDFParse } from "pdf-parse";

// Extract plain text from an uploaded PDF.
// Accepts the raw bytes (e.g. from `await file.arrayBuffer()`).
export async function extractTextFromPdf(data: ArrayBuffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(data) });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

// A single piece of resume text after chunking.
export interface Chunk {
  id: number;
  text: string;
}

// A chunk paired with its embedding vector.
export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

// Structured analysis returned by POST /api/analyze.
export interface AnalysisResult {
  finalScore: number;
  similarityScore: number;
  llmScore: number;
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
}

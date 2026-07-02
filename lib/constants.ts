// AI models
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const ANALYSIS_MODEL = "claude-opus-4-8";

// RAG configuration
export const CHUNK_MIN_WORDS = 300;
export const CHUNK_MAX_WORDS = 500;
export const RETRIEVAL_TOP_K = 3;

// Semantic chunk selection (Phase 13): only sections whose cosine similarity to
// the query exceeds the threshold are sent to the scoring LLM, up to the cap.
export const SEMANTIC_MIN_SIMILARITY = 0.4;
export const MAX_CONTEXT_CHUNKS = 6;

// Candidate pipeline (Phase 8). Order reflects funnel progression.
export const CANDIDATE_STATUSES = [
  "sourced",
  "screening",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const DEFAULT_CANDIDATE_STATUS: CandidateStatus = "screening";

// Embedding reliability
export const EMBEDDING_BATCH_SIZE = 5;
export const EMBEDDING_MAX_CHUNKS = 30;
export const EMBEDDING_TIMEOUT_MS = 20000;
export const EMBEDDING_MAX_RETRIES = 3;
export const EMBEDDING_RETRY_BASE_DELAY_MS = 500;

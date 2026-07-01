// AI models
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const ANALYSIS_MODEL = "claude-opus-4-8";

// RAG configuration
export const CHUNK_MIN_WORDS = 300;
export const CHUNK_MAX_WORDS = 500;
export const RETRIEVAL_TOP_K = 3;

// Embedding reliability
export const EMBEDDING_BATCH_SIZE = 5;
export const EMBEDDING_MAX_CHUNKS = 30;
export const EMBEDDING_TIMEOUT_MS = 20000;
export const EMBEDDING_MAX_RETRIES = 3;
export const EMBEDDING_RETRY_BASE_DELAY_MS = 500;

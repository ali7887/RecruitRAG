// Phase 13 — RAG enhancement helpers: query expansion, similarity calibration,
// and match-strength labeling. Pure, deterministic, dependency-free TypeScript.

// The raw cosine band that relevant matches typically fall into. The min-max
// scaler stretches this narrow band across a readable 0–100 range.
export const RAW_SIM_MIN = 0.7;
export const RAW_SIM_MAX = 0.9;

const MAX_EXPANSION_KEYWORDS = 7;

// Split a project's requirements / context into distinct technical keywords.
function extractProjectKeywords(context: string): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const raw of context.split(/[,\n;/|]+/)) {
    const keyword = raw.trim();
    const key = keyword.toLowerCase();
    if (keyword.length < 2 || seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
  }
  return keywords;
}

// Bias a search query toward a project's needs by appending 5–7 of its keywords
// before embedding. No project context → the query is returned unchanged.
export function expandQuery(query: string, projectContext?: string | null): string {
  if (!projectContext) return query;
  const keywords = extractProjectKeywords(projectContext).slice(0, MAX_EXPANSION_KEYWORDS);
  return keywords.length ? `${query} ${keywords.join(" ")}` : query;
}

// Map a raw cosine similarity onto a readable 0–100 scale via a linear min-max
// scaler. Scores below `min` clamp to 0, above `max` clamp to 100.
export function calibrateSimilarity(
  raw: number,
  min: number = RAW_SIM_MIN,
  max: number = RAW_SIM_MAX,
): number {
  if (max <= min) return 0;
  const t = (raw - min) / (max - min);
  return Math.max(0, Math.min(100, Math.round(t * 100)));
}

// Project a 0–1 relevance signal into the raw-cosine band, so demo/mock scores
// run through the same calibrateSimilarity mapping as live embeddings.
export function mockRawCosine(signal: number): number {
  const clamped = Math.max(0, Math.min(1, signal));
  return RAW_SIM_MIN + clamped * (RAW_SIM_MAX - RAW_SIM_MIN);
}

// Human-readable match strength derived from a calibrated 0–100 score.
export function matchStrengthLabel(score: number): string {
  if (score >= 55) return "High Semantic Match";
  if (score >= 30) return "Semantic Match";
  return "Keyword Match";
}

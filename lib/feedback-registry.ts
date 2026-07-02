// Recruiter-validated reasoning patterns (Phase 18). A small, process-lifetime
// ring buffer of heuristics extracted from approved/adjusted analyses, injected
// into the next analysis prompt. No DB schema change; resets on cold start.

const MAX_PATTERNS = 30;
const patterns: string[] = [];

// Record a pattern from an approved/adjusted review. Deduped, capped at 30 (FIFO).
export function recordFeedbackPattern(pattern: string): void {
  const trimmed = pattern.trim();
  if (!trimmed || patterns.includes(trimmed)) return;
  patterns.push(trimmed);
  if (patterns.length > MAX_PATTERNS) patterns.splice(0, patterns.length - MAX_PATTERNS);
}

export function getFeedbackPatterns(): string[] {
  return [...patterns];
}

// Markdown bullet list for prompt injection, or a neutral placeholder.
export function formatFeedbackPatterns(): string {
  return patterns.length ? patterns.map((pattern) => `- ${pattern}`).join("\n") : "None yet.";
}

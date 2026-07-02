type EnvKey = "OPENAI_API_KEY" | "ANTHROPIC_API_KEY";

function readEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Set it, or set USE_DEMO_MODE=true to run without external providers.`,
    );
  }
  return value;
}

// Lazy getters so a missing key only throws when actually used at request time,
// not during `next build`.
export const env = {
  get openaiApiKey(): string {
    return readEnv("OPENAI_API_KEY");
  },
  get anthropicApiKey(): string {
    return readEnv("ANTHROPIC_API_KEY");
  },
  // Optional. When "true", the app bypasses OpenAI/Anthropic and serves a
  // static demo analysis. Absent or any other value means real providers.
  get useDemoMode(): boolean {
    return process.env.USE_DEMO_MODE === "true";
  },
};

// Explicit boot/runtime validation (Phase 17). Fails fast with a descriptive
// message instead of a cryptic provider error deep in a request. In demo/mock
// mode nothing external is required; without DATABASE_URL the app runs against
// the in-memory store, so DATABASE_URL is only validated when it is set.
export function validateEnv(): void {
  if (env.useDemoMode) return;

  const missing: string[] = [];
  if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY (resume embeddings)");
  if (!process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY (analysis + briefings)");

  if (missing.length > 0) {
    throw new Error(
      `RecruitRAG is not in demo mode but required provider keys are missing: ${missing.join(", ")}. ` +
        "Set the keys, or set USE_DEMO_MODE=true to run without external providers.",
    );
  }
}

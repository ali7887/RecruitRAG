const REQUIRED_ENV = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"] as const;

type EnvKey = (typeof REQUIRED_ENV)[number];

function readEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
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
};

// Next.js boot hook (Phase 17). Validates required environment variables when
// the server starts, so misconfiguration fails fast with a clear message
// instead of a cryptic provider error mid-request. Skipped during the build
// phase so `next build` never depends on runtime secrets.
export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { validateEnv } = await import("@/lib/env");
  validateEnv();
}

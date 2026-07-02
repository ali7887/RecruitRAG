"use client";

// Route-level error boundary (Phase 15): a single failed read renders a clean
// card with a reload action instead of crashing the app.
export default function ProjectError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h1 className="text-lg font-semibold text-zinc-100">Couldn’t load this project</h1>
        <p className="text-sm text-zinc-400">
          Something went wrong while loading the project. This is usually temporary.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

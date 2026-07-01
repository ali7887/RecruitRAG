import { Dashboard } from "@/components/dashboard";
import { env } from "@/lib/env";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:h-screen lg:overflow-hidden">
      <header className="flex shrink-0 flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          RecruitRAG · AI Engineering Demo
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          AI Resume Matching with Transparent RAG Analysis
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
          Upload a resume, compare it against a job description, and receive structured AI
          evaluation powered by embeddings and LLM analysis.
        </p>
      </header>

      <Dashboard demoMode={env.useDemoMode} />
    </main>
  );
}

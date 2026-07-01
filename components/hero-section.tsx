export function HeroSection() {
  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        AI Engineering Demo
      </span>

      <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
        AI Resume Matching with Transparent RAG Analysis
      </h1>

      <p className="max-w-2xl text-balance text-base leading-relaxed text-zinc-400 sm:text-lg">
        Upload a resume, compare it against a job description, and see a structured match
        score powered by embeddings and LLM evaluation.
      </p>
    </section>
  );
}

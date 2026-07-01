import Link from "next/link";
import { ScoreRing } from "@/components/score-ring";
import { createProjectAction } from "@/lib/actions";
import { listProjectSummaries } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjectSummaries();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Hiring projects</h1>
          <p className="text-sm text-zinc-400">
            Group candidates and analyses under a role you are hiring for.
          </p>
        </header>

        <form
          action={createProjectAction}
          className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
        >
          <input
            name="title"
            required
            placeholder="Senior React Developer"
            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none"
          />
          <textarea
            name="description"
            rows={3}
            placeholder="Paste the job description…"
            className="resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none"
          />
          <input
            name="requirements"
            placeholder="Target keywords — e.g. React, TypeScript, Next.js"
            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 self-start rounded-xl bg-cyan-600 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
          >
            Create project
          </button>
        </form>

        {projects.length === 0 ? (
          <p className="text-sm text-zinc-600">No projects yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex h-full items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700"
                >
                  <ScoreRing score={project.averageScore} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{project.title}</p>
                    {project.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                        {project.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-500">
                      <span className="text-zinc-300">{project.candidateCount}</span> candidate
                      {project.candidateCount === 1 ? "" : "s"}
                      <span className="mx-1.5 text-zinc-700">·</span>
                      avg match <span className="text-cyan-300">{project.averageScore}</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import { createProjectAction } from "@/lib/actions";
import { listProjects } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Hiring projects
          </h1>
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
            placeholder="Frontend Engineer — Berlin"
            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none"
          />
          <textarea
            name="description"
            rows={3}
            placeholder="Paste the job description…"
            className="resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 self-start rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Create project
          </button>
        </form>

        {projects.length === 0 ? (
          <p className="text-sm text-zinc-600">No projects yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{project.title}</p>
                    {project.description && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{project.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {project.createdAt.toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

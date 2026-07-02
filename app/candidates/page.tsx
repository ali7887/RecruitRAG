import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { listCandidates } from "@/lib/db/repository";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ assigned?: string }>;
}) {
  const { workspaceId, role } = await getWorkspaceContext();
  const { assigned } = await searchParams;
  const assignedToMe = assigned === "me";
  const all = await listCandidates(workspaceId);
  const candidates = assignedToMe
    ? all.filter((candidate) => candidate.assignedReviewerId === role)
    : all;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Candidates</h1>
          <p className="text-sm text-zinc-400">
            Stored candidate profiles from analyzed resumes.
          </p>
        </header>

        <SearchBar />

        <div className="flex items-center gap-1.5">
          <Link
            href="/candidates"
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              assignedToMe
                ? "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
            }`}
          >
            All
          </Link>
          <Link
            href="/candidates?assigned=me"
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              assignedToMe
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Assigned to me ({role})
          </Link>
        </div>

        {candidates.length === 0 ? (
          <p className="text-sm text-zinc-600">
            {assignedToMe ? "No candidates assigned to you." : "No candidates yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <Link
                  href={`/candidates/${candidate.id}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{candidate.name}</p>
                    {candidate.email && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{candidate.email}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {candidate.createdAt.toLocaleDateString()}
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

import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { listCandidates } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const candidates = await listCandidates();

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

        {candidates.length === 0 ? (
          <p className="text-sm text-zinc-600">No candidates yet.</p>
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

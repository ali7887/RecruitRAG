"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchCandidatesAction } from "@/lib/actions";
import type { CandidateMatch } from "@/lib/search";

const TOP_N = 3;
const DEBOUNCE_MS = 250;

// Minimalist semantic search over stored candidates. Debounced input drives a
// server action; the top matches render in a "Quick View" popover below.
export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CandidateMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search whenever the query changes.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const matches = await searchCandidatesAction(trimmed);
        setResults(matches.slice(0, TOP_N));
        setOpen(true);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  // Close the popover on outside click.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search candidates by skills, experience, role…"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none"
      />

      {open && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-xl shadow-black/40 backdrop-blur">
          {pending && results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-zinc-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-zinc-500">No matching candidates.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {results.map((match) => (
                <li key={match.id}>
                  <Link
                    href={`/candidates/${match.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/40"
                    onClick={() => setOpen(false)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{match.name}</p>
                      {match.snippet && (
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{match.snippet}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-cyan-300">
                      {match.score}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

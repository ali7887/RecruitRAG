import { RUBRIC_POSITIVE, type EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { cellKey, scoreColorClass, type Candidate, type Role } from "@/lib/multi";
import { cn } from "@/lib/utils";

// Compact rubric string for a matrix cell, e.g. "C86 E80 I72".
function miniRubric(result: EvaluatedAnalysis): string {
  if (!result.rubricScores) return "";
  return RUBRIC_POSITIVE.slice(0, 3)
    .map((d) => `${d.short[0]}${result.rubricScores![d.key]}`)
    .join(" ");
}

// Candidates (rows) × Roles (columns) score matrix. Stays inside the results
// column; scrolls internally if it exceeds the available space.
export function MultiAnalysisTable({
  candidates,
  roles,
  results,
}: {
  candidates: Candidate[];
  roles: Role[];
  results: Record<string, EvaluatedAnalysis>;
}) {
  return (
    <div className="overflow-auto rounded-2xl border border-zinc-800">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-zinc-900 p-2 text-left font-medium text-zinc-500">
              Candidate
            </th>
            {roles.map((role) => (
              <th
                key={role.id}
                className="max-w-28 truncate whitespace-nowrap p-2 text-left font-medium text-zinc-400"
              >
                {role.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.id} className="border-t border-zinc-800">
              <td className="sticky left-0 z-10 max-w-28 truncate whitespace-nowrap bg-zinc-900 p-2 text-zinc-300">
                {candidate.name}
              </td>
              {roles.map((role) => {
                const result = results[cellKey(candidate.id, role.id)];
                return (
                  <td key={role.id} className="p-2 align-top">
                    {result ? (
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            scoreColorClass(result.finalScore),
                          )}
                        >
                          {result.finalScore}
                        </span>
                        <span className="whitespace-nowrap text-[10px] text-zinc-500">
                          {miniRubric(result)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

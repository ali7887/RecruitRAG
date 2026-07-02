"use client";

import { useState, useTransition } from "react";
import { generateBriefingAction } from "@/lib/actions";
import type { Briefing } from "@/lib/briefing";

// AI recruiter briefing for a single analysis: an executive summary, technical
// fit, hiring recommendation, and interview focus, generated on demand.
export function BriefingPanel({
  analysisId,
  briefing: initial,
  canWrite,
}: {
  analysisId: string;
  briefing: Briefing | null;
  canWrite: boolean;
}) {
  const [briefing, setBriefing] = useState<Briefing | null>(initial);
  const [isPending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateBriefingAction(analysisId);
      if (result) setBriefing(result);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-800 pt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          AI briefing
        </h4>
        {canWrite && (
          <button
            onClick={generate}
            disabled={isPending}
            className="rounded-lg border border-cyan-500/40 px-2.5 py-1 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-50"
          >
            {isPending ? "Generating…" : briefing ? "Regenerate" : "Generate briefing"}
          </button>
        )}
      </div>

      {briefing ? (
        <div className="flex flex-col gap-3">
          <Field label="Executive summary" value={briefing.aiSummary} />
          <Field label="Technical fit" value={briefing.technicalSummary} />
          <Field label="Recommendation" value={briefing.hiringRecommendation} />
          {briefing.interviewFocus.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[11px] uppercase tracking-wider text-zinc-600">Interview focus</p>
              <ul className="flex flex-col gap-0.5">
                {briefing.interviewFocus.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-zinc-400">
                    <span className="text-cyan-500/70">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-600">No briefing yet — generate a recruiter summary.</p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="text-sm leading-relaxed text-zinc-300">{value}</p>
    </div>
  );
}

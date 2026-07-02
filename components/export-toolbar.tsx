"use client";

import { useTransition } from "react";
import {
  exportProjectJSON,
  exportProjectMarkdown,
  exportProjectTextSummary,
} from "@/lib/actions";
import type { ExportFile } from "@/lib/export";

type ExportAction = (projectId: string) => Promise<ExportFile | null>;

// Turn an ExportFile into a client-side download without leaving the page.
function download(file: ExportFile) {
  const url = URL.createObjectURL(new Blob([file.content], { type: file.mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Export toolbar for a project report (Markdown / JSON / plain summary).
export function ExportToolbar({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();

  function run(action: ExportAction) {
    startTransition(async () => {
      const file = await action(projectId);
      if (file) download(file);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ExportButton onClick={() => run(exportProjectMarkdown)} disabled={isPending}>
        Export Markdown
      </ExportButton>
      <ExportButton onClick={() => run(exportProjectJSON)} disabled={isPending}>
        Export JSON
      </ExportButton>
      <ExportButton onClick={() => run(exportProjectTextSummary)} disabled={isPending}>
        Export Summary
      </ExportButton>
    </div>
  );
}

function ExportButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

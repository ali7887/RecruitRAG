// Compact dashboard-style metadata shown between the animation and results.
// All fields except processingTimeMs are optional so the row degrades
// gracefully when a value can't be derived.
export interface ProcessingMetadata {
  processingTimeMs: number;
  chunkCount?: number;
  retrievedChunkCount?: number;
  estimatedTokens?: number;
}

function formatTokens(tokens: number): string {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : `${tokens}`;
}

export function ProcessingStats({ metadata }: { metadata: ProcessingMetadata }) {
  const stats: { value: string; label: string }[] = [
    { value: `${metadata.processingTimeMs}ms`, label: "processed" },
  ];
  if (metadata.chunkCount != null) {
    stats.push({ value: `${metadata.chunkCount}`, label: "chunks indexed" });
  }
  if (metadata.retrievedChunkCount != null) {
    stats.push({ value: `${metadata.retrievedChunkCount}`, label: "chunks retrieved" });
  }
  if (metadata.estimatedTokens != null) {
    stats.push({ value: `~${formatTokens(metadata.estimatedTokens)}`, label: "tokens analyzed" });
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      {stats.map((stat) => (
        <span key={stat.label} className="flex items-baseline gap-1.5">
          <span className="font-medium text-emerald-400">{stat.value}</span>
          <span>{stat.label}</span>
        </span>
      ))}
    </div>
  );
}

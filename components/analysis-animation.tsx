"use client";

import type { CSSProperties } from "react";

// Persistent AI/RAG pipeline visualization: Resume → retrieved chunks →
// transformer-inspired layers → Match Analysis. Stays on screen at all times.
//   - "active": fast particle flow, bright pulses, quick spin (during analysis).
//   - "idle":   calm breathing, slow pulses, dimmed flow (monitoring state).
// Pure SVG + CSS keyframes, no dependencies.

const RESUME = { x: 54, y: 84 };
const OUTPUT = { x: 392, y: 84 };

const CHUNK_X = 96;
const CHUNK_Y = [60, 84, 108];

const COLS = [200, 260, 320];
const ROWS = [52, 84, 116];

const NODES = COLS.flatMap((x) => ROWS.map((y) => ({ x, y })));

const LINKS: { x1: number; y1: number; x2: number; y2: number }[] = [];
for (let c = 0; c < COLS.length - 1; c++) {
  for (const y1 of ROWS) {
    for (const y2 of ROWS) {
      LINKS.push({ x1: COLS[c], y1, x2: COLS[c + 1], y2 });
    }
  }
}

const CYAN = "#22d3ee";
const EMERALD = "#34d399";
const PARTICLES: { d: string; delay: number; color: string }[] = [
  ...CHUNK_Y.map((y, i) => ({
    d: `M${CHUNK_X + 12} ${y} L${COLS[0]} ${ROWS[i]}`,
    delay: i * 0.15,
    color: EMERALD,
  })),
  { d: `M${COLS[0]} 84 L${COLS[1]} 52`, delay: 0.5, color: CYAN },
  { d: `M${COLS[0]} 52 L${COLS[1]} 84`, delay: 0.6, color: CYAN },
  { d: `M${COLS[0]} 116 L${COLS[1]} 84`, delay: 0.7, color: CYAN },
  { d: `M${COLS[1]} 84 L${COLS[2]} 52`, delay: 0.9, color: CYAN },
  { d: `M${COLS[1]} 52 L${COLS[2]} 116`, delay: 1.0, color: CYAN },
  { d: `M${COLS[1]} 116 L${COLS[2]} 84`, delay: 1.1, color: CYAN },
  ...ROWS.map((y, i) => ({
    d: `M${COLS[2]} ${y} L${OUTPUT.x} ${OUTPUT.y}`,
    delay: 1.3 + i * 0.15,
    color: EMERALD,
  })),
];

type Mode = "active" | "idle";

const TIMING: Record<Mode, CSSProperties> = {
  active: { "--arag-flow": "1.6s", "--arag-pulse": "1.8s", "--arag-spin": "3s" } as CSSProperties,
  idle: { "--arag-flow": "4s", "--arag-pulse": "4.5s", "--arag-spin": "9s" } as CSSProperties,
};

export function AnalysisAnimation({ mode = "idle" }: { mode?: Mode }) {
  const caption =
    mode === "active"
      ? "Embedding · retrieving context · running LLM analysis…"
      : "Pipeline idle · awaiting analysis";

  return (
    <div
      className="flex w-full flex-col items-center gap-2"
      data-mode={mode}
      style={TIMING[mode]}
    >
      <svg
        viewBox="0 0 440 168"
        className="arag-svg w-full max-w-md"
        role="img"
        aria-label="AI analysis pipeline"
      >
        <defs>
          <filter id="arag-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="arag-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={EMERALD} />
            <stop offset="100%" stopColor={CYAN} />
          </linearGradient>
        </defs>

        {LINKS.map((l, i) => (
          <line
            key={`l-${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#27272a"
            strokeWidth={0.75}
          />
        ))}

        <g className="arag-node" stroke={EMERALD} strokeWidth={1.5} fill="none">
          <rect x={45} y={68} width={18} height={26} rx={2.5} />
          <line x1={49} y1={76} x2={59} y2={76} />
          <line x1={49} y1={81} x2={59} y2={81} />
          <line x1={49} y1={86} x2={55} y2={86} />
        </g>

        {CHUNK_Y.map((y, i) => (
          <rect
            key={`ch-${i}`}
            x={CHUNK_X - 14}
            y={y - 7}
            width={22}
            height={14}
            rx={3}
            fill="#0b1220"
            stroke={CYAN}
            strokeWidth={1}
            className="arag-chunk"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}

        {NODES.map((n, i) => (
          <circle
            key={`n-${i}`}
            cx={n.x}
            cy={n.y}
            r={5}
            fill={CYAN}
            filter="url(#arag-glow)"
            className="arag-node"
            style={{ animationDelay: `${(i % 5) * 0.2}s` }}
          />
        ))}

        <circle
          cx={OUTPUT.x}
          cy={OUTPUT.y}
          r={19}
          fill="none"
          stroke="url(#arag-ring)"
          strokeWidth={2}
          strokeDasharray="28 90"
          strokeLinecap="round"
          className="arag-ring"
        />
        <circle
          cx={OUTPUT.x}
          cy={OUTPUT.y}
          r={11}
          fill={EMERALD}
          filter="url(#arag-glow)"
          className="arag-node"
        />

        {PARTICLES.map((p, i) => (
          <circle
            key={`p-${i}`}
            r={2.2}
            cx={0}
            cy={0}
            fill={p.color}
            filter="url(#arag-glow)"
            className="arag-particle"
            style={{ offsetPath: `path('${p.d}')`, animationDelay: `${p.delay}s` }}
          />
        ))}

        <text x={RESUME.x} y={112} textAnchor="middle" fontSize={9} fill="#71717a">
          Resume
        </text>
        <text x={260} y={148} textAnchor="middle" fontSize={8.5} fill="#52525b">
          embeddings · attention layers
        </text>
        <text x={OUTPUT.x} y={120} textAnchor="middle" fontSize={9} fill="#71717a">
          Match Analysis
        </text>
      </svg>

      <p className="text-xs text-zinc-500">{caption}</p>

      <style>{`
        @keyframes arag-flow {
          0% { offset-distance: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes arag-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes arag-chunkpulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes arag-spin { to { transform: rotate(360deg); } }
        @keyframes arag-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.015); }
        }
        .arag-particle { offset-rotate: 0deg; animation: arag-flow var(--arag-flow, 2s) linear infinite; }
        .arag-node { animation: arag-pulse var(--arag-pulse, 2s) ease-in-out infinite; }
        .arag-chunk { animation: arag-chunkpulse var(--arag-pulse, 1.6s) ease-in-out infinite; }
        .arag-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: arag-spin var(--arag-spin, 3s) linear infinite;
        }
        [data-mode="idle"] .arag-particle { opacity: 0.5; }
        [data-mode="idle"] .arag-svg { animation: arag-breathe 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .arag-particle, .arag-node, .arag-chunk, .arag-ring, .arag-svg { animation: none; }
          .arag-particle { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

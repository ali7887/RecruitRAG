import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const STEPS: {
  title: string;
  description: string;
  Icon: ComponentType<IconProps>;
}[] = [
  {
    title: "Upload resume",
    description: "Drop a PDF resume and paste the job description you want to match against.",
    Icon: UploadIcon,
  },
  {
    title: "Retrieve relevant experience",
    description: "Embeddings surface the resume sections most relevant to the role.",
    Icon: SearchIcon,
  },
  {
    title: "AI evaluates the match",
    description: "The LLM scores fit and generates strengths, gaps, and interview questions.",
    Icon: SparkIcon,
  },
];

export function HowItWorks() {
  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
          How it works
        </h2>
        <p className="max-w-md text-sm text-zinc-500">
          A transparent retrieval-augmented pipeline, from upload to insight.
        </p>
      </div>

      <ol className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-emerald-400">
                <step.Icon className="size-4" />
              </span>
              <span className="text-sm font-medium text-zinc-600">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-medium text-zinc-100">{step.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Simple stroked SVG placeholders — no icon dependency.
function UploadIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 15V4m0 0L8 8m4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SparkIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-5.5-2.5 2.5m-4 4-2.5 2.5m0-9 2.5 2.5m4 4 2.5 2.5" />
    </svg>
  );
}

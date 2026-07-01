// Ready-made job descriptions so the analyzer can be tried in seconds without
// writing one. Kept moderate in length to avoid growing the textarea.

export const SAMPLE_JOB_DESCRIPTIONS: { id: string; title: string; text: string }[] = [
  {
    id: "frontend",
    title: "Senior Frontend Engineer (Next.js / TypeScript)",
    text: `Senior Frontend Engineer (Next.js / TypeScript)

We're hiring a Senior Frontend Engineer to build fast, accessible product experiences for a modern SaaS platform.

Responsibilities:
- Ship features across a Next.js (App Router) + TypeScript codebase
- Partner with design and backend to deliver polished, responsive UI
- Own component architecture, state management, and performance budgets
- Write unit and integration tests and take part in code reviews

Requirements:
- 4+ years building production React applications
- Strong TypeScript, Next.js, and Tailwind CSS experience
- Solid grasp of accessibility, Core Web Vitals, and SSR/CSR trade-offs
- Comfortable with REST APIs and Git-based workflows

Nice to have:
- Design systems / shadcn/ui experience
- Exposure to AI product surfaces (LLM/RAG)
- Vercel deployment and frontend observability`,
  },
  {
    id: "fullstack",
    title: "Full-Stack Engineer (Node / PostgreSQL)",
    text: `Full-Stack Engineer (Node / PostgreSQL)

Build and scale end-to-end features for a data-driven web platform.

Responsibilities:
- Design and implement APIs in Node.js/TypeScript backed by PostgreSQL
- Model relational schemas and write efficient, indexed queries
- Build React frontends and integrate them with backend services
- Add testing, logging, and CI to keep deploys safe

Requirements:
- 4+ years full-stack experience across Node and a modern frontend
- Strong SQL and PostgreSQL data modeling
- Experience designing REST or RPC APIs and handling auth
- Comfort with automated testing and code review

Nice to have:
- Background jobs, caching, and observability
- Cloud deployment (Vercel, AWS, or GCP)`,
  },
  {
    id: "ai",
    title: "AI Engineer (RAG / LLM)",
    text: `AI Engineer (RAG / LLM)

Design retrieval-augmented systems that turn unstructured data into reliable answers.

Responsibilities:
- Build RAG pipelines: chunking, embeddings, retrieval, and evaluation
- Integrate LLM APIs and design structured, constrained prompts
- Measure quality with grounding, relevance, and hallucination checks
- Optimize latency, cost, and token usage in production

Requirements:
- 3+ years software engineering, with recent LLM/RAG work
- Strong TypeScript or Python plus vector search and embeddings experience
- Familiarity with OpenAI/Anthropic APIs and prompt design
- A solid testing and evaluation mindset

Nice to have:
- Semantic caching, reranking, and agent frameworks
- Next.js / serverless deployment experience`,
  },
];

// Default sample used by the one-click "Use sample JD" action.
export const SAMPLE_JOB_DESCRIPTION = SAMPLE_JOB_DESCRIPTIONS[0].text;

// Compact variant, useful where a shorter description is preferable.
export const SAMPLE_JOB_DESCRIPTION_SHORT = `Senior Frontend Engineer (Next.js / TypeScript). Build production React apps with 4+ years of experience. Strong TypeScript, Next.js App Router, and Tailwind CSS. Focus on accessibility, Core Web Vitals, testing, and design-system work. Bonus: exposure to LLM/RAG product surfaces and Vercel deployment.`;

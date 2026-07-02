# RecruitRAG — Project Status

Last Updated: 2026-07-01

---

## ✅ Phase 7 — Recruitment Projects & Candidate Assignment

Project-based workspace: recruiters create hiring projects and assign/evaluate
candidates under each one.

Data layer:
- `projects` table gains a `requirements` (keywords) column (`lib/db/schema.ts`).
  Apply with `npm run db:push`; demo/in-memory mode needs no migration.
- Repository (`lib/db/repository.ts`): `createProject` now stores requirements;
  added `listProjectSummaries()` (per-project candidate count + average match)
  and `getProjectDetails()` (project + score-ranked candidates).
- Project-scoped semantic search via `searchCandidates(query, projectId?)`.

UI:
- `app/projects/page.tsx`: metrics grid with the cyan `ScoreRing`
  (`components/score-ring.tsx`) showing average match and candidate counts.
- `app/projects/[id]/page.tsx`: two-column layout — role metadata + keyword
  chips + add-candidate form on the left; ranked candidate board and a
  project-scoped `SearchBar` on the right.
- Nav: "Projects" placed before "Insights" (`components/nav-bar.tsx`).

Demo mode:
- Seeds 3 projects ("Frontend Engineer (Next.js/TS)", "AI RAG specialist",
  "DevOps / Infrastructure") and 3 candidates → 9 analyses, so each candidate
  tops exactly one board (`lib/db/memory.ts`).

Status: Build passing.

---

# 1) Project Overview

RecruitRAG is a minimal AI-powered recruitment SaaS MVP.

Purpose:
- Upload a resume PDF
- Compare it against a job description
- Use a RAG pipeline for semantic matching
- Generate AI-powered hiring analysis
- Return a hybrid match score

Primary goals:
- Strong AI engineering showcase
- Modern SaaS UX
- Clean TypeScript architecture
- Portfolio-quality GitHub project
- Vercel deployment

---

# 2) Current Architecture

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- OpenAI embeddings
- Claude Opus analysis
- Vercel-compatible architecture

Architecture style:
- Minimal
- Server-first
- No database
- No auth
- No background jobs
- No queues
- No Docker
- No Redis

---

# 3) Completed Phases

## ✅ Phase 1 — Project Scaffold

Completed:
- Base Next.js setup
- Tailwind setup
- Environment handling
- Shared constants
- Shared domain types

Implemented files:
- lib/env.ts
- lib/constants.ts
- lib/types.ts

Status:
- Stable
- Do not recreate

---

## ✅ Phase 2 — Core RAG Utilities

Completed:
- PDF text extraction
- Resume chunking
- OpenAI embeddings
- Cosine similarity retrieval
- Hybrid scoring

Implemented files:
- lib/parser.ts
- lib/chunker.ts
- lib/embeddings.ts
- lib/similarity.ts
- lib/scoring.ts

Pipeline status:
- Fully implemented
- Build passing

Status:
- Stable
- Do not reimplement

---
# 3) Completed Phases

## ✅ Phase 1 — Project Scaffold

Implemented files:
- lib/env.ts
- lib/constants.ts
- lib/types.ts

Status:
Stable foundation for shared configuration and typing.

---

## ✅ Phase 2 — Core RAG Utilities

Implemented files:
- lib/parser.ts
- lib/chunker.ts
- lib/embeddings.ts
- lib/similarity.ts
- lib/scoring.ts

Capabilities:
- PDF text extraction
- Resume chunking
- OpenAI embeddings
- cosine similarity retrieval
- hybrid scoring

Status:
Stable RAG utility layer.

---

## ✅ Phase 3 — Analyze API Route

Implemented file:
- app/api/analyze/route.ts

Capabilities:
- multipart form parsing
- resume PDF validation
- job description validation
- execution of the full RAG pipeline
- retrieval of top‑K resume chunks
- Claude Opus analysis
- robust JSON parsing from LLM output
- hybrid score calculation

Response format:

{
  "finalScore": number,
  "similarityScore": number,
  "llmScore": number,
  "strengths": string[],
  "gaps": string[],
  "interviewQuestions": string[]
}

Status:
AI pipeline fully functional.
Backend ready for frontend integration.

# 4) Current RAG Pipeline

PDF Upload
↓
parser.extractTextFromPdf()
↓
chunker.chunkText()
↓
embeddings.embedChunks()
↓
similarity.retrieveTopChunks()
↓
Claude analysis (Phase 3)
↓
scoring.combineScores()
↓
Final structured JSON response

---

# 5) Established Technical Decisions

These decisions are finalized unless explicitly changed.

## Embeddings
- Provider: OpenAI
- Model: text-embedding-3-small

## Retrieval
- Similarity: cosine similarity
- Top K retrieval: 3 chunks

## Scoring
Formula:
0.6 * similarity + 0.4 * llmScore

## Chunking
- 300–500 words per chunk

## AI Analysis
- Claude Opus 4.8

---

# 6) Source of Truth Files

## Shared Config
- lib/constants.ts

## Environment Access
- lib/env.ts

## Shared Types
- lib/types.ts

## Prompt Definitions
- prompts/

## Engineering Rules
- CLAUDE.md

---

# 7) Important Rules

## Do NOT:
- recreate completed utilities
- duplicate constants
- duplicate types
- introduce unnecessary abstractions
- add infra outside MVP scope
- rewrite working modules without reason

## Always:
- inspect existing files first
- keep implementation incremental
- preserve build stability
- keep TypeScript strict
- minimize dependencies
- keep APIs typed

---

# 8) Build Status

Current status:
- npm run build passes

This must remain true after every phase.

---

# 9) Current Phase

ACTIVE PHASE:
➡️ Phase 3 — Analyze API Route

Goal:
Implement:
- app/api/analyze/route.ts

Responsibilities:
- parse multipart form data
- run the RAG pipeline
- retrieve top chunks
- call Claude Opus
- compute hybrid score
- return structured analysis JSON

---

# 10) Next Planned Phases

## Phase 3
API integration with Claude

## Phase 4
Modern frontend UI:
- upload form
- loading states
- result cards
- score visualization

## Phase 5
Polish:
- responsive improvements
- empty states
- UX refinement
- deployment validation

---

# 11) Repository Safety Notes

Before implementing:
- read CLAUDE.md
- read this file
- inspect git status
- inspect existing implementation

If functionality already exists:
- extend it
- do not recreate it

---

# 12) Definition of MVP Completion

The MVP is considered complete when:
- Resume PDF upload works
- JD input works
- RAG pipeline works
- Claude analysis works
- Hybrid score works
- Modern UI works
- Deployment works on Vercel

No additional infrastructure is required.

---

# 13) Current Priority

Highest current priority:
✅ Complete Phase 3 API route cleanly and minimally.

Avoid:
- premature frontend complexity
- architectural expansion
- unnecessary optimization

Focus on:
- correctness
- simplicity
- maintainability

---

# 14) Provider Error Handling

- OpenAI quota errors are detected explicitly (HTTP 429, `insufficient_quota`
  code/type) and surfaced through `QuotaExceededError`.
- Insufficient quota is never retried — only transient network/timeout errors
  are. The analyze route returns HTTP 429 with a clean JSON `error` message; raw
  provider stack traces are never exposed to the client (logged server-side).
- Demo mode can be enabled with `USE_DEMO_MODE=true`.
- Demo mode is explicit only — it bypasses OpenAI/Anthropic and returns a static
  typed `AnalysisResult` (`lib/demo-analysis.ts`). The app never falls back to
  demo results silently after a quota error.

---

# 15) Post-MVP Phases (7–17)

The MVP was extended into a workspace-based SaaS. Summary of added capabilities:

- **7 — Projects**: `projects`/`analyses` tables; project dashboard + detail
  views; scoped candidate boards.
- **8 — Pipeline**: `analyses.status` + `notes`; inline status/notes controls.
- **9 — Exports**: deterministic Markdown / JSON / summary downloads
  (`lib/export.ts`).
- **10 — AI briefings**: `aiSummary` / `technicalSummary` / `hiringRecommendation`
  / `interviewFocus`; one low-token Claude call with heuristic fallback
  (`lib/briefing.ts`).
- **11 — Cross-project intelligence**: candidate history, best-fit
  (`lib/candidate-insights.ts`) and portfolio analytics
  (`lib/portfolio-analytics.ts`) on `/insights`.
- **12 — Resume parsing 2.0**: normalized text + structured `parsed_*` profile
  (`lib/resume-parser.ts`).
- **13 — RAG enhancement**: query expansion, similarity calibration, semantic
  chunk selection, embedding cache (`lib/rag-optimizer.ts`).
- **14 — Multi-tenancy + RBAC**: `workspaces` table, `workspace_id` isolation on
  every query, cookie-based workspace/role context (`lib/workspace.ts`).
- **15 — Migrations + resilience**: staged Postgres migration + `docs/migration-guide.md`;
  graceful ingestion fallbacks with a UI flag; route-level `error.tsx` boundaries.
- **16 — Audit logs**: immutable, workspace-scoped `audit_logs` with a read-only
  activity feed on `/insights`.
- **17 — Production hardening**: FIFO-bounded embedding cache, `validateEnv()`
  boot check (`instrumentation.ts`), log cleanup.

Live Postgres requires the migrations in `drizzle/`; demo (in-memory) mode runs
with no setup. See `docs/migration-guide.md`.

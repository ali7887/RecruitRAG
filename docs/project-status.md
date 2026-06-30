# RecruitRAG — Project Status

Last Updated: 2026-06-30

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

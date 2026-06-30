# Architecture

## Stack

Frontend + Backend:
- Next.js 15
- TypeScript
- App Router

UI:
- TailwindCSS
- shadcn/ui

AI:
- Claude Opus 4.8
- OpenAI Embeddings

Parsing:
- pdf-parse

Deployment:
- Vercel

## Architecture Flow

PDF Upload
↓
PDF Parsing
↓
Text Chunking
↓
Embedding Generation
↓
Similarity Search
↓
Relevant Chunk Retrieval
↓
LLM Analysis
↓
Structured JSON Output

## Design Principles

- Minimal architecture
- No external database
- In-memory processing
- Vercel-first deployment
- Fast iteration

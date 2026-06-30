# RecruitRAG Engineering Rules

You are a Senior Full-Stack + AI Engineer.

Your mission is to build **RecruitRAG**:  
a minimal, production-ready AI SaaS MVP for resume-to-job-description matching using a RAG pipeline.

The project must be:
- technically strong
- simple and maintainable
- visually polished
- Vercel-compatible
- suitable for portfolio / GitHub showcase

---

## 1) Product Goal

Build a minimal AI hiring assistant that:

- accepts a resume PDF
- accepts a job description
- extracts and chunks resume text
- generates embeddings
- retrieves the most relevant resume chunks
- sends the relevant context to the LLM
- returns a structured analysis with:
  - match score
  - strengths
  - gaps
  - suggested interview questions
  - final hybrid score

This is an MVP.
Focus only on the smallest useful version that works well.

---

## 2) Core Stack

Use these technologies unless explicitly changed by the repository:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- App Router
- Vercel-compatible serverless patterns
- RAG-based resume analysis

Follow the actual versions already installed in the repository.
Do not downgrade or migrate framework versions unless explicitly asked.

---

## 3) Engineering Priorities

Prioritize in this order:

1. Correctness
2. Simplicity
3. Readability
4. Performance
5. UX polish
6. Minimal dependencies

Always prefer the simplest implementation that satisfies the requirement.

---

## 4) Architectural Principles

- Keep the architecture minimal.
- Avoid overengineering.
- Build incrementally.
- Prefer server components when possible.
- Keep files small, focused, and readable.
- Use strict typing everywhere.
- Minimize dependencies.
- Optimize for performance.
- Reuse existing utilities and constants.
- Design for maintainability, not theoretical scalability.

If a simple function is enough, do not introduce a class.
If a local utility is enough, do not introduce a framework pattern.
If a single API route is enough, do not split prematurely.

---

## 5) Explicitly Out of Scope

Do NOT add any of the following unless explicitly requested:

- Authentication
- Database
- Redis
- Docker
- Queues
- Background workers
- Kubernetes
- Payments
- Multi-user systems
- Admin dashboards
- Rate limiting infrastructure
- Observability platforms
- Complex caching layers
- Analytics integrations
- Feature flags
- i18n
- Testing frameworks unless explicitly requested
- CI/CD workflows unless explicitly requested

Do not "prepare for future scale" with unnecessary abstractions.

---

## 6) UI Principles

The UI should follow these principles:

- Apple-style minimalism
- Dark mode only
- Elegant spacing
- Soft shadows
- Rounded corners
- Smooth UX
- Clear visual hierarchy
- Modern SaaS feel
- Minimal text noise
- Professional portfolio quality

Prefer:
- restrained color usage
- strong typography
- balanced whitespace
- subtle interactions
- simple layouts

Avoid:
- visual clutter
- too many sections
- excessive gradients
- loud colors
- gimmicky animations
- unnecessary icons everywhere

---

## 7) Code Quality Rules

- No duplicated code
- No unnecessary abstractions
- Use async/await
- Keep APIs typed
- Validate inputs
- Fail clearly
- Handle edge cases reasonably
- Keep naming precise and descriptive
- Prefer pure functions where possible
- Avoid hidden side effects

Write code that another senior engineer can scan quickly and trust.

---

## 8) TypeScript Rules

- Use strict TypeScript
- Avoid `any`
- Prefer explicit types for public functions
- Reuse types from `lib/types.ts` where appropriate
- Keep types close to the domain
- Narrow types instead of weakening them
- Validate unknown inputs at boundaries
- Return predictable shapes from APIs

If type safety and convenience conflict, prefer type safety.

---

## 9) Dependency Rules

- Minimize dependencies
- Prefer built-in platform APIs when reasonable
- Do not add a library for a trivial utility
- Before adding a dependency, verify it is necessary
- Prefer lightweight, stable, well-maintained packages
- Avoid dependencies that increase complexity without strong payoff

When adding a dependency, keep usage narrow and justified.

---

## 10) File and Module Rules

- Only modify necessary files
- Do not rewrite unrelated files
- Extend existing files instead of recreating them when possible
- Keep modules focused on one responsibility
- Reuse shared constants from `lib/constants.ts`
- Reuse environment access from `lib/env.ts`
- Reuse domain types from `lib/types.ts`
- Do not duplicate config values across files

Before creating a new file:
1. check whether the logic belongs in an existing file
2. check whether a similar utility already exists
3. only create a new file if separation improves clarity

---

## 11) Anti-Duplication Rules

Always inspect the current codebase before implementing.

You must:
- read `docs/project-status.md` before starting implementation
- check `git status`
- inspect relevant existing files
- avoid recreating completed utilities
- extend existing implementations when appropriate
- preserve previously completed phases

Never reimplement something that already exists unless:
- the user explicitly asks for refactoring, or
- the current implementation is clearly broken and needs correction

If a file already exists, assume it is intentional.
Understand it before changing it.

---

## 12) Build and Validation Rules

Every implementation must keep the project buildable.

Requirements:
- Ensure `npm run build` passes after changes
- Do not leave partial broken code
- Validate critical inputs at the API boundary
- Return meaningful errors
- Keep response contracts stable
- Do not introduce UI logic into server utilities
- Do not introduce server-only logic into client components

If a task is incomplete, leave the code in a valid, non-broken state.

---

## 13) Workflow Rules

Work phase-by-phase.

For every phase:
1. read the relevant docs
2. inspect the current repository state
3. implement only the requested scope
4. keep changes minimal and focused
5. verify the build
6. summarize what changed
7. wait for confirmation before continuing

Do not silently continue into the next phase.

---

## 14) Repository Awareness

Before implementing anything, inspect at least:

- `CLAUDE.md`
- `docs/project-status.md`
- relevant docs for the current phase
- relevant files in `lib/`, `app/`, `components/`, or `prompts/`
- current `git status`

Use the repository as the source of truth, not assumptions from prior conversation.

---

## 15) RAG-Specific Rules

This project uses a minimal RAG pipeline.

Current and future RAG logic should follow these principles:

- keep chunking deterministic and simple
- keep embedding logic isolated
- keep retrieval logic explicit and testable
- keep scoring transparent
- make data flow easy to trace
- avoid magical abstractions around the pipeline
- keep prompt inputs structured and minimal
- do not hide ranking logic inside unrelated modules

The expected high-level flow is:

1. parse resume PDF
2. extract plain text
3. chunk text
4. generate embeddings
5. embed the job description/query
6. retrieve top relevant chunks
7. send retrieved context to the LLM
8. compute hybrid score
9. return structured analysis JSON

Keep this flow obvious in the code.

---

## 16) API Design Rules

For API routes:

- keep handlers small and readable
- validate request inputs immediately
- use typed response shapes
- return consistent error structures when practical
- avoid mixing unrelated concerns
- keep orchestration in the route, logic in `lib/`
- do not embed large prompt strings directly if prompt files already exist

API routes should orchestrate.
Utilities should implement the logic.

---

## 17) Prompt and LLM Rules

- Reuse prompt files from `/prompts` when available
- Do not hardcode large prompt templates inside route handlers unless explicitly requested
- Keep LLM output structured and easy to parse
- Prefer deterministic, constrained outputs for MVP behavior
- Ensure prompt inputs contain only relevant context
- Do not send unnecessary noise to the model
- Keep the model integration clean and isolated

When possible, preserve a clean boundary between:
- retrieval logic
- prompt construction
- model invocation
- response parsing

---

## 18) Performance Rules

- Prefer small, efficient implementations
- Avoid unnecessary repeated work
- Cache only when clearly useful and simple
- Keep serverless execution constraints in mind
- Avoid loading large unnecessary dependencies
- Batch external API calls when appropriate
- Keep token usage lean where practical

Do not micro-optimize prematurely, but do avoid obvious waste.

---

## 19) Documentation Rules

After each completed phase, clearly state:

- what files were created or modified
- what the phase now does
- how it connects to previous phases
- any assumptions made
- what remains for the next phase

When relevant, update or align with `docs/project-status.md`.

---

## 20) Git Safety Rules

Treat the repository state as important.

- Respect existing work
- Avoid destructive rewrites unless explicitly requested
- Prefer minimal diffs
- Do not rename or move files without clear reason
- Keep the repository easy to review

If a phase is completed, assume it should remain stable unless asked otherwise.

---

## 21) Decision Heuristics

When unsure, choose the option that is:

- simpler
- clearer
- smaller
- easier to review
- easier to maintain
- more aligned with MVP scope

Ask:
- Is this necessary now?
- Is there already a file or utility for this?
- Can this be implemented with fewer moving parts?
- Does this improve the actual product, or just the architecture?

If it only improves theoretical architecture, probably do not do it.

---

## 22) Definition of Success

A successful implementation for RecruitRAG is:

- minimal
- clean
- buildable
- typed
- understandable
- demo-ready
- visually polished
- AI-centric
- portfolio-worthy

The goal is not to build a huge platform.
The goal is to build an excellent, focused MVP.

---

## 23) Phase Discipline

Never jump ahead unnecessarily.

Do not add:
- future dashboard pages
- extra APIs
- admin tools
- persistence layers
- analytics
- user management
- feature-complete SaaS infrastructure

Only build what the current phase requires.

Stop after completing the requested phase and wait for confirmation.

---

## 24) Final Behavioral Rule

Be conservative with changes, precise with implementation, and ruthless about simplicity.

Build only what is needed.
Reuse what already exists.
Keep the project clean.
Do not duplicate work.
Always leave the repository in a valid state.

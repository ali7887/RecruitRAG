import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Evidence, RubricScores } from "@/lib/evaluation-rubric";

// Tenant boundary (Phase 14). Projects and candidates belong to one workspace.
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Hiring projects (e.g. "Frontend Engineer — Berlin").
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  // Target skills / keywords for the role, stored as free text.
  requirements: text("requirements").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Stored candidate profiles with parsed resume text and a mean embedding.
export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  resumeText: text("resume_text").notNull().default(""),
  resumeEmbedding: jsonb("resume_embedding").$type<number[]>(),
  // Lightweight structured profile extracted during ingestion (Phase 12).
  // Nullable: absent until a resume is parsed.
  parsedHeadline: text("parsed_headline"),
  parsedSkills: jsonb("parsed_skills").$type<string[]>(),
  parsedExperienceYears: integer("parsed_experience_years"),
  parsedWorkSummary: text("parsed_work_summary"),
  // True when the structured profile came from the heuristic fallback because
  // the LLM parse failed (Phase 15 ingestion resilience).
  parsedViaFallback: boolean("parsed_via_fallback"),
  // Team collaboration (Phase 19): the role/user assigned to review this
  // candidate, and when. Nullable until assigned.
  assignedReviewerId: text("assigned_reviewer_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One analysis of a candidate against a role within a project.
export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  // Pipeline stage for this candidate within the project (Phase 8).
  status: text("status").notNull().default("screening"),
  // Free-text recruiter notes for this candidate within the project.
  notes: text("notes").notNull().default(""),
  similarityScore: integer("similarity_score").notNull(),
  llmScore: integer("llm_score").notNull(),
  finalScore: integer("final_score").notNull(),
  rubricScores: jsonb("rubric_scores").$type<RubricScores>(),
  evidence: jsonb("evidence").$type<Evidence>(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  gaps: jsonb("gaps").$type<string[]>().notNull(),
  interviewQuestions: jsonb("interview_questions").$type<string[]>().notNull(),
  // AI recruiter briefing (Phase 10), generated on demand from the analysis.
  // Nullable: absent until a briefing is generated.
  aiSummary: text("ai_summary"),
  technicalSummary: text("technical_summary"),
  hiringRecommendation: text("hiring_recommendation"),
  interviewFocus: jsonb("interview_focus").$type<string[]>(),
  // Human-in-the-loop scoring review (Phase 18).
  // reviewStatus: "pending" | "approved" | "adjusted" | "rejected".
  reviewStatus: text("review_status").notNull().default("pending"),
  reviewerNotes: text("reviewer_notes"),
  adjustedFinalScore: integer("adjusted_final_score"),
  // Automated ATS decision (Phase 20), e.g. "Auto-shortlisted". Null = none.
  automationDecision: text("automation_decision"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Immutable, workspace-scoped audit trail for compliance (Phase 16, GDPR).
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id"),
  targetName: text("target_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type CandidateRow = typeof candidates.$inferSelect;
export type AnalysisRow = typeof analyses.$inferSelect;

export type NewWorkspace = typeof workspaces.$inferInsert;
export type NewProject = typeof projects.$inferInsert;
export type NewCandidate = typeof candidates.$inferInsert;
export type NewAnalysis = typeof analyses.$inferInsert;

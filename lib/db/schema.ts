import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Evidence, RubricScores } from "@/lib/evaluation-rubric";

// Hiring projects (e.g. "Frontend Engineer — Berlin").
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  // Target skills / keywords for the role, stored as free text.
  requirements: text("requirements").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Stored candidate profiles with parsed resume text and a mean embedding.
export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  resumeText: text("resume_text").notNull().default(""),
  resumeEmbedding: jsonb("resume_embedding").$type<number[]>(),
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
  similarityScore: integer("similarity_score").notNull(),
  llmScore: integer("llm_score").notNull(),
  finalScore: integer("final_score").notNull(),
  rubricScores: jsonb("rubric_scores").$type<RubricScores>(),
  evidence: jsonb("evidence").$type<Evidence>(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  gaps: jsonb("gaps").$type<string[]>().notNull(),
  interviewQuestions: jsonb("interview_questions").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type CandidateRow = typeof candidates.$inferSelect;
export type AnalysisRow = typeof analyses.$inferSelect;

export type NewProject = typeof projects.$inferInsert;
export type NewCandidate = typeof candidates.$inferInsert;
export type NewAnalysis = typeof analyses.$inferInsert;

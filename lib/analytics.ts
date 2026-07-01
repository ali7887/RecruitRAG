import { listAnalyses, listCandidates } from "@/lib/db/repository";
import type { AnalysisRow } from "@/lib/db/schema";

export interface GlobalStats {
  averageScore: number;
  averageSimilarity: number;
  averageLlm: number;
  totalCandidates: number;
  totalAnalyses: number;
}

export interface SkillCount {
  skill: string;
  count: number;
}

export interface ScoreBucket {
  label: string;
  count: number;
}

// Everything the insights dashboard needs, computed in one pass.
export interface DashboardData {
  stats: GlobalStats;
  skills: SkillCount[];
  distribution: ScoreBucket[];
}

const TOP_SKILLS = 8;
const BUCKET_COUNT = 10; // 0–9, 10–19, … 90–100

// Average score, candidate and analysis totals across all stored analyses.
export async function getGlobalStats(): Promise<GlobalStats> {
  const [rows, candidates] = await Promise.all([listAnalyses(), listCandidates()]);
  return computeGlobalStats(rows, candidates.length);
}

// Occurrence count of every matched skill in analysis evidence, most common first.
export async function getSkillDistribution(): Promise<SkillCount[]> {
  return computeSkillDistribution(await listAnalyses());
}

// Final-score histogram in ten equal 10-point buckets.
export async function getScoreDistribution(): Promise<ScoreBucket[]> {
  return computeScoreDistribution(await listAnalyses());
}

// Single fetch + compute for the page, honoring the "no heavy work in render" rule.
export async function getDashboardData(): Promise<DashboardData> {
  const [rows, candidates] = await Promise.all([listAnalyses(), listCandidates()]);
  return {
    stats: computeGlobalStats(rows, candidates.length),
    skills: computeSkillDistribution(rows),
    distribution: computeScoreDistribution(rows),
  };
}

function computeGlobalStats(rows: AnalysisRow[], totalCandidates: number): GlobalStats {
  return {
    averageScore: average(rows.map((row) => row.finalScore)),
    averageSimilarity: average(rows.map((row) => row.similarityScore)),
    averageLlm: average(rows.map((row) => row.llmScore)),
    totalCandidates,
    totalAnalyses: rows.length,
  };
}

function computeSkillDistribution(rows: AnalysisRow[]): SkillCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const skill of row.evidence?.matchedSkills ?? []) {
      const key = skill.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, TOP_SKILLS);
}

function computeScoreDistribution(rows: AnalysisRow[]): ScoreBucket[] {
  const buckets = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    label: i === BUCKET_COUNT - 1 ? "90–100" : `${i * 10}–${i * 10 + 9}`,
    count: 0,
  }));
  for (const row of rows) {
    const index = Math.min(Math.floor(row.finalScore / 10), BUCKET_COUNT - 1);
    buckets[index].count += 1;
  }
  return buckets;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

import type { GradeBand, ScoreRecord, Settings } from "@/db/types";
import { DEFAULT_GRADING } from "./constants";

export interface SubjectResult {
  subjectId: string;
  ca1: number;
  ca2: number;
  ca3: number;
  ca: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
}

export function gradeFor(total: number, grading: GradeBand[] = DEFAULT_GRADING): GradeBand {
  const band = grading.find((g) => total >= g.min && total <= g.max);
  return band ?? { grade: "-", min: 0, max: 0, remark: "-" };
}

export function computeSubject(score: ScoreRecord, grading: GradeBand[]): SubjectResult {
  const ca = (score.ca1 || 0) + (score.ca2 || 0) + (score.ca3 || 0);
  const total = ca + (score.exam || 0);
  const band = gradeFor(total, grading);
  return {
    subjectId: score.subjectId,
    ca1: score.ca1 || 0,
    ca2: score.ca2 || 0,
    ca3: score.ca3 || 0,
    ca,
    exam: score.exam || 0,
    total,
    grade: band.grade,
    remark: band.remark,
  };
}

export interface StudentAggregate {
  studentId: string;
  subjects: SubjectResult[];
  total: number;
  average: number;
  position: number;
  outOf: number;
}

export function ordinal(n: number): string {
  if (n <= 0) return "-";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? "th";
  return `${n}${suffix}`;
}

/**
 * Computes aggregates and class positions from raw scores.
 * Positions are ranked strictly on average score (competition or dense ranking).
 */
export function computeClassResults(
  scores: ScoreRecord[],
  studentIds: string[],
  settings: Pick<Settings, "grading" | "positionMethod">,
): StudentAggregate[] {
  const grading = settings.grading?.length ? settings.grading : DEFAULT_GRADING;
  const aggregates: StudentAggregate[] = studentIds.map((studentId) => {
    const own = scores.filter((s) => s.studentId === studentId);
    const subjects = own.map((s) => computeSubject(s, grading));
    const total = subjects.reduce((a, b) => a + b.total, 0);
    const average = subjects.length ? total / subjects.length : 0;
    return {
      studentId,
      subjects,
      total,
      average: Math.round(average * 100) / 100,
      position: 0,
      outOf: studentIds.length,
    };
  });

  const ranked = [...aggregates].sort((a, b) => b.average - a.average);
  let lastAvg: number | null = null;
  let lastPos = 0;
  ranked.forEach((agg, index) => {
    if (agg.subjects.length === 0) {
      agg.position = 0;
      return;
    }
    if (lastAvg !== null && agg.average === lastAvg) {
      agg.position = lastPos;
    } else {
      agg.position = settings.positionMethod === "DENSE" ? lastPos + 1 : index + 1;
      lastPos = agg.position;
      lastAvg = agg.average;
    }
  });

  return aggregates;
}

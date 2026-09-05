import { getDB } from "@/db";
import { balanceFor } from "@/services";
import { computeClassResults, type StudentAggregate } from "@/lib/result-engine";
import { DEFAULT_ASSESSMENT, DEFAULT_GRADING, DEFAULT_RATING_SCALE } from "@/lib/constants";
import type {
  AssessmentConfig,
  Organization,
  SchoolClass,
  Student,
  Subject,
} from "@/db/types";

/**
 * Student Result Checker data layer.
 *
 * Every function here takes the authenticated student's own id and reads only
 * that student's records. Nothing in this module accepts a registration number
 * or student id straight from the URL — the portal keeps the id in its session
 * and re-verifies the student on every read, so a tampered session or state
 * simply fails to resolve a student.
 */

export const STUDENT_SESSION_KEY = "scholareer.student.session";
/** Used when a school has not set a personal result-checker password yet. */
export const DEFAULT_STUDENT_PASSWORD = "Scholar123";

export const portalPasswordFor = (s: Student) =>
  (s.portalPassword ?? "").trim() || DEFAULT_STUDENT_PASSWORD;

export interface StudentSession {
  studentId: string;
  regNumber: string;
}

const normalise = (v: string) => v.trim().toLowerCase();

/** Resolves a registration number + password to the existing student master record. */
export async function authenticateStudent(
  regNumber: string,
  password: string,
): Promise<StudentSession> {
  const reg = normalise(regNumber);
  if (!reg || !password) throw new Error("Enter your registration number and password.");
  const all = await getDB().students.toArray();
  const student = all.find((s) => normalise(s.admissionNumber) === reg);
  if (!student) throw new Error("Registration number or password is incorrect.");
  if (student.status !== "ACTIVE") {
    throw new Error("This student record is not active. Please contact the school.");
  }
  if (password !== portalPasswordFor(student)) {
    throw new Error("Registration number or password is incorrect.");
  }
  return { studentId: student.id, regNumber: student.admissionNumber };
}

/** Re-validates a stored session against the database. Returns null when invalid. */
export async function resolveStudentSession(
  session: StudentSession | null,
): Promise<Student | null> {
  if (!session?.studentId) return null;
  const student = await getDB().students.get(session.studentId);
  if (!student || student.status !== "ACTIVE") return null;
  if (normalise(student.admissionNumber) !== normalise(session.regNumber)) return null;
  return student;
}

export function readStudentSession(): StudentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STUDENT_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StudentSession) : null;
  } catch {
    return null;
  }
}

export const writeStudentSession = (s: StudentSession) =>
  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(s));

export const clearStudentSession = () => localStorage.removeItem(STUDENT_SESSION_KEY);

export interface TermKey {
  session: string;
  term: string;
}

/** Sessions and terms for which this student actually has stored scores. */
export async function listStudentTerms(studentId: string): Promise<TermKey[]> {
  const scores = await getDB().scores.where("studentId").equals(studentId).toArray();
  const seen = new Map<string, TermKey>();
  for (const s of scores) seen.set(`${s.session}|${s.term}`, { session: s.session, term: s.term });
  return [...seen.values()].sort(
    (a, b) => a.session.localeCompare(b.session) || a.term.localeCompare(b.term),
  );
}

export type ResultAccess = "ALLOWED" | "BLOCKED" | "NOT_READY" | "NO_RESULT";

export interface StudentPortalResult {
  access: ResultAccess;
  message?: string;
  /** Present only when access is ALLOWED — blocked results never carry data. */
  data?: {
    org: Organization;
    student: Student;
    cls: SchoolClass | undefined;
    subjects: Subject[];
    agg: StudentAggregate;
    assessment: AssessmentConfig;
    ratingScale: { value: number; label: string }[];
    attendance: { daysOpened: number; present: number; absent: number };
    affective: Record<string, number>;
    psychomotor: Record<string, number>;
    teacherComment: string;
    principalComment: string;
    status: string;
    session: string;
    term: string;
  };
}

/**
 * Loads one term's result for the authenticated student after checking RACE.
 * When RACE blocks the result, no result data is returned at all.
 */
export async function loadStudentResult(
  session: StudentSession | null,
  academicSession: string,
  term: string,
): Promise<StudentPortalResult> {
  const student = await resolveStudentSession(session);
  if (!student) return { access: "NO_RESULT", message: "Please sign in again." };

  const db = getDB();
  const orgId = student.organizationId;
  const [org, settings, classmates, allScores, meta, classAttendance, subjects, fees, payments] =
    await Promise.all([
      db.organizations.get(orgId),
      db.settings.get(orgId),
      db.students.where("classId").equals(student.classId).toArray(),
      db.scores.where("classId").equals(student.classId).toArray(),
      db.results.get(`${student.id}|${academicSession}|${term}`),
      db.attendance.where("classId").equals(student.classId).toArray(),
      db.subjects.where("organizationId").equals(orgId).toArray(),
      db.fees.where("organizationId").equals(orgId).toArray(),
      db.payments.where("studentId").equals(student.id).toArray(),
    ]);

  if (!org) return { access: "NO_RESULT", message: "School record unavailable." };

  const own = allScores.filter(
    (s) => s.studentId === student.id && s.session === academicSession && s.term === term,
  );
  if (own.length === 0) {
    return {
      access: "NO_RESULT",
      message: "No result has been recorded for the selected session and term.",
    };
  }

  // ---- RACE: Result Access Control Engine ------------------------------
  const bal = balanceFor(student.id, student.classId, fees, payments, academicSession, term);
  const autoBlocked = Boolean(settings?.blockResultOnDebt) && bal.balance > 0;
  const blocked =
    meta?.manualOverride === "BLOCK"
      ? true
      : meta?.manualOverride === "ALLOW"
        ? false
        : (meta?.accessBlocked ?? false) || autoBlocked;

  if (blocked) {
    return {
      access: "BLOCKED",
      message: "Result access is currently restricted. Please contact the school administration.",
    };
  }

  const status = meta?.status ?? "DRAFT";
  if (status !== "PUBLISHED") {
    return {
      access: "NOT_READY",
      message:
        "Your result is not yet available for viewing. Please contact the school administration.",
    };
  }

  // ---- Existing result calculation engine ------------------------------
  const activeMates = classmates.filter((s) => s.status === "ACTIVE");
  const termScores = allScores.filter((s) => s.session === academicSession && s.term === term);
  const aggs = computeClassResults(
    termScores,
    activeMates.map((s) => s.id),
    {
      grading: settings?.grading?.length ? settings.grading : DEFAULT_GRADING,
      positionMethod: settings?.positionMethod ?? "COMPETITION",
    },
  );
  const agg = aggs.find((a) => a.studentId === student.id);
  if (!agg) return { access: "NO_RESULT", message: "No result found for this term." };

  const daysOpened = new Set(classAttendance.map((a) => a.date)).size;
  const present = classAttendance.filter(
    (a) => a.studentId === student.id && (a.status === "PRESENT" || a.status === "LATE"),
  ).length;

  return {
    access: "ALLOWED",
    data: {
      org,
      student,
      cls: await db.classes.get(student.classId),
      subjects,
      agg,
      assessment: settings?.assessment ?? DEFAULT_ASSESSMENT,
      ratingScale: settings?.ratingScale?.length ? settings.ratingScale : DEFAULT_RATING_SCALE,
      attendance: { daysOpened, present, absent: Math.max(daysOpened - present, 0) },
      affective: meta?.affective ?? {},
      psychomotor: meta?.psychomotor ?? {},
      teacherComment: meta?.teacherComment ?? "",
      principalComment: meta?.principalComment ?? "",
      status,
      session: academicSession,
      term,
    },
  };
}

export interface TermTrend {
  session: string;
  term: string;
  average: number;
}

/** Past averages computed only from this student's own scores. */
export async function studentTrend(
  session: StudentSession | null,
  grading = DEFAULT_GRADING,
): Promise<TermTrend[]> {
  const student = await resolveStudentSession(session);
  if (!student) return [];
  const scores = await getDB().scores.where("studentId").equals(student.id).toArray();
  const buckets = new Map<string, { session: string; term: string; total: number; n: number }>();
  for (const s of scores) {
    const key = `${s.session}|${s.term}`;
    const total = (s.ca1 || 0) + (s.ca2 || 0) + (s.ca3 || 0) + (s.exam || 0);
    const b = buckets.get(key) ?? { session: s.session, term: s.term, total: 0, n: 0 };
    b.total += total;
    b.n += 1;
    buckets.set(key, b);
  }
  void grading;
  return [...buckets.values()]
    .map((b) => ({
      session: b.session,
      term: b.term,
      average: b.n ? Math.round((b.total / b.n) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.session.localeCompare(b.session) || a.term.localeCompare(b.term));
}

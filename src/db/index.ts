import Dexie, { type Table } from "dexie";
import type {
  Attendance,
  AuditLog,
  Book,
  Borrowing,
  FeeStructure,
  Notification,
  Organization,
  Payment,
  ResultMeta,
  SchoolClass,
  ScoreRecord,
  Settings,
  Student,
  Subject,
  Teacher,
  TraitConfig,
  User,
  Visitor,
} from "./types";

export class ScholareerDB extends Dexie {
  organizations!: Table<Organization, string>;
  settings!: Table<Settings, string>;
  users!: Table<User, string>;
  students!: Table<Student, string>;
  classes!: Table<SchoolClass, string>;
  subjects!: Table<Subject, string>;
  teachers!: Table<Teacher, string>;
  scores!: Table<ScoreRecord, string>;
  results!: Table<ResultMeta, string>;
  fees!: Table<FeeStructure, string>;
  payments!: Table<Payment, string>;
  attendance!: Table<Attendance, string>;
  books!: Table<Book, string>;
  borrowings!: Table<Borrowing, string>;
  visitors!: Table<Visitor, string>;
  notifications!: Table<Notification, string>;
  auditLogs!: Table<AuditLog, string>;
  traits!: Table<TraitConfig, string>;

  constructor() {
    super("scholareer");
    this.version(1).stores({
      organizations: "id, schoolCode",
      settings: "id, organizationId",
      users: "id, email, organizationId, role",
      students: "id, organizationId, classId, admissionNumber, status, lastName",
      classes: "id, organizationId, level, name",
      subjects: "id, organizationId, subjectCode",
      teachers: "id, organizationId, staffId, email",
      scores: "id, organizationId, studentId, classId, subjectId, session, term, status",
      results: "id, organizationId, studentId, classId, session, term, status",
      fees: "id, organizationId, classId, session, term",
      payments: "id, organizationId, studentId, session, term, receiptNumber, date",
      attendance: "id, organizationId, studentId, classId, date",
      books: "id, organizationId, isbn, title",
      borrowings: "id, organizationId, studentId, bookId, status",
      visitors: "id, organizationId, status, timeIn",
      notifications: "id, organizationId, read, createdAt",
      auditLogs: "id, organizationId, timestamp, user, entity",
      traits: "id, organizationId, domain",
    });
  }
}

let _db: ScholareerDB | null = null;

/** Centralized database accessor. Browser-only (IndexedDB). */
export function getDB(): ScholareerDB {
  if (typeof window === "undefined") {
    throw new Error("Database is only available in the browser");
  }
  if (!_db) _db = new ScholareerDB();
  return _db;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

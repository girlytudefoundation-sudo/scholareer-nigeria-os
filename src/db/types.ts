export type ID = string;

export type Role =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "PROPRIETOR"
  | "PRINCIPAL"
  | "VICE_PRINCIPAL"
  | "BURSAR"
  | "CASHIER"
  | "TEACHER"
  | "FORM_TEACHER"
  | "LIBRARIAN"
  | "RECEPTIONIST";

export const ROLES: Role[] = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "PROPRIETOR",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "BURSAR",
  "CASHIER",
  "TEACHER",
  "FORM_TEACHER",
  "LIBRARIAN",
  "RECEPTIONIST",
];

export interface Organization {
  id: ID;
  name: string;
  schoolCode: string;
  logo?: string | undefined;
  address: string;
  phone: string;
  email: string;
  principalName: string;
  proprietorName: string;
  motto: string;
  state: string;
  country: string;
  currentSession: string;
  currentTerm: string;
  resumptionDate: string;
}

export interface GradeBand {
  grade: string;
  min: number;
  max: number;
  remark: string;
}

export interface TraitConfig {
  id: ID;
  name: string;
  domain: "AFFECTIVE" | "PSYCHOMOTOR";
  organizationId: ID;
}

export type ModuleKey =
  | "students"
  | "teachers"
  | "academics"
  | "results"
  | "finance"
  | "attendance"
  | "library"
  | "visitors"
  | "idcards"
  | "reports";

export interface Settings {
  id: ID; // = organizationId
  organizationId: ID;
  grading: GradeBand[];
  passMark: number;
  caMaximum: number;
  examMaximum: number;
  positionMethod: "COMPETITION" | "DENSE";
  blockResultOnDebt: boolean;
  modules: Record<ModuleKey, boolean>;
  ratingScale: { value: number; label: string }[];
}

export interface User {
  id: ID;
  name: string;
  email: string;
  password: string;
  role: Role;
  organizationId: ID | null;
  teacherId?: ID | undefined;
  status: "ACTIVE" | "SUSPENDED";
}

export type StudentStatus = "ACTIVE" | "GRADUATED" | "TRANSFERRED" | "WITHDRAWN";

export interface Student {
  id: ID;
  admissionNumber: string;
  firstName: string;
  middleName?: string | undefined;
  lastName: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;
  passport?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  address?: string | undefined;
  parentName: string;
  parentPhone: string;
  parentEmail?: string | undefined;
  classId: ID;
  arm: string;
  house?: string | undefined;
  admissionDate: string;
  status: StudentStatus;
  organizationId: ID;
}

export type ClassLevel = "CRECHE" | "NURSERY" | "PRIMARY" | "JSS" | "SSS";

export interface SchoolClass {
  id: ID;
  name: string;
  level: ClassLevel;
  arm: string;
  organizationId: ID;
  formTeacherId?: ID | undefined;
  caMaximum?: number | undefined;
  examMaximum?: number | undefined;
}

export interface Subject {
  id: ID;
  subjectName: string;
  subjectCode: string;
  category: string;
  maximumScore: number;
  caMaximum: number;
  examMaximum: number;
  passMark: number;
  gradingScheme: string;
  classIds: ID[];
  organizationId: ID;
}

export interface Teacher {
  id: ID;
  staffId: string;
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE";
  phone: string;
  email: string;
  qualification: string;
  subjectIds: ID[];
  classIds: ID[];
  formClassId?: ID | undefined;
  status: "ACTIVE" | "INACTIVE";
  organizationId: ID;
}

export type ScoreStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "BLOCKED";

export interface ScoreRecord {
  id: ID;
  organizationId: ID;
  studentId: ID;
  classId: ID;
  subjectId: ID;
  session: string;
  term: string;
  ca1: number;
  ca2: number;
  ca3: number;
  exam: number;
  status: ScoreStatus;
  enteredBy?: string | undefined;
  updatedAt: string;
}

export interface ResultMeta {
  id: ID; // studentId|session|term
  organizationId: ID;
  studentId: ID;
  classId: ID;
  session: string;
  term: string;
  status: ScoreStatus;
  accessBlocked: boolean;
  blockReason?: string | undefined;
  manualOverride?: "ALLOW" | "BLOCK" | null | undefined;
  teacherComment?: string | undefined;
  principalComment?: string | undefined;
  traits: Record<string, number>;
  updatedAt: string;
}

export type PaymentMethod = "CASH" | "POS" | "BANK_TRANSFER" | "ONLINE";

export interface FeeStructure {
  id: ID;
  organizationId: ID;
  classId: ID;
  session: string;
  term: string;
  title: string;
  amount: number;
}

export interface Payment {
  id: ID;
  organizationId: ID;
  receiptNumber: string;
  studentId: ID;
  session: string;
  term: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string | undefined;
  description?: string | undefined;
  cashier: string;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface Attendance {
  id: ID; // studentId|date
  organizationId: ID;
  studentId: ID;
  classId: ID;
  date: string;
  status: AttendanceStatus;
}

export interface Book {
  id: ID;
  organizationId: ID;
  isbn: string;
  title: string;
  author: string;
  category: string;
  quantity: number;
  available: number;
}

export interface Borrowing {
  id: ID;
  organizationId: ID;
  studentId: ID;
  bookId: ID;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string | undefined;
  status: "BORROWED" | "RETURNED";
}

export interface Visitor {
  id: ID;
  organizationId: ID;
  name: string;
  phone: string;
  purpose: string;
  personToVisit: string;
  idType: string;
  idNumber: string;
  timeIn: string;
  timeOut?: string | undefined;
  status: "IN" | "OUT";
}

export interface Notification {
  id: ID;
  organizationId: ID;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: ID;
  organizationId: ID;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  details?: string | undefined;
}

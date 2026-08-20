import type { AssessmentConfig, GradeBand, ModuleKey, Role } from "@/db/types";

export const DEFAULT_GRADING: GradeBand[] = [
  { grade: "A", min: 70, max: 100, remark: "Excellent" },
  { grade: "B", min: 60, max: 69, remark: "Very Good" },
  { grade: "C", min: 50, max: 59, remark: "Good" },
  { grade: "D", min: 45, max: 49, remark: "Pass" },
  { grade: "E", min: 40, max: 44, remark: "Weak Pass" },
  { grade: "F", min: 0, max: 39, remark: "Fail" },
];

/** CA1 + CA2 + Examination always sums to 100. */
export const DEFAULT_ASSESSMENT: AssessmentConfig = { ca1Max: 15, ca2Max: 15, examMax: 70 };

export const DEFAULT_RATING_SCALE = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Very Good" },
  { value: 3, label: "Good" },
  { value: 2, label: "Fair" },
  { value: 1, label: "Poor" },
];

export const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  students: true,
  teachers: true,
  academics: true,
  results: true,
  finance: true,
  attendance: true,
  library: true,
  visitors: true,
  idcards: true,
  reports: true,
};

export const AFFECTIVE_TRAITS = [
  "Punctuality",
  "Attendance",
  "Neatness",
  "Honesty",
  "Cooperation",
  "Leadership",
  "Responsibility",
  "Courtesy",
];

export const PSYCHOMOTOR_TRAITS = [
  "Handwriting",
  "Sports",
  "Drawing",
  "Craft",
  "Coordination",
  "Practical Skills",
  "Creativity",
  "Physical Fitness",
];

export const TERMS = ["First Term", "Second Term", "Third Term"];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "School Admin",
  PROPRIETOR: "Proprietor",
  PRINCIPAL: "Principal",
  VICE_PRINCIPAL: "Vice Principal",
  BURSAR: "Bursar",
  CASHIER: "Cashier",
  TEACHER: "Teacher",
  FORM_TEACHER: "Form Teacher",
  LIBRARIAN: "Librarian",
  RECEPTIONIST: "Receptionist",
};

export const naira = (n: number) =>
  "₦" + (n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });

import type { Role } from "@/db/types";

export type Permission =
  | "school.manage"
  | "system.manage"
  | "students.view"
  | "students.manage"
  | "teachers.view"
  | "teachers.manage"
  | "classes.manage"
  | "subjects.manage"
  | "scores.enter"
  | "results.view"
  | "results.approve"
  | "results.access"
  | "finance.view"
  | "finance.record"
  | "attendance.manage"
  | "library.manage"
  | "visitors.manage"
  | "idcards.view"
  | "reports.view"
  | "audit.view"
  | "settings.manage";

const ALL: Permission[] = [
  "school.manage",
  "students.view",
  "students.manage",
  "teachers.view",
  "teachers.manage",
  "classes.manage",
  "subjects.manage",
  "scores.enter",
  "results.view",
  "results.approve",
  "results.access",
  "finance.view",
  "finance.record",
  "attendance.manage",
  "library.manage",
  "visitors.manage",
  "idcards.view",
  "reports.view",
  "audit.view",
  "settings.manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [...ALL, "system.manage"],
  SCHOOL_ADMIN: ALL,
  PROPRIETOR: [
    "students.view",
    "teachers.view",
    "results.view",
    "finance.view",
    "reports.view",
    "audit.view",
    "settings.manage",
    "school.manage",
  ],
  PRINCIPAL: [
    "students.view",
    "students.manage",
    "teachers.view",
    "classes.manage",
    "subjects.manage",
    "results.view",
    "results.approve",
    "results.access",
    "finance.view",
    "attendance.manage",
    "reports.view",
    "audit.view",
    "idcards.view",
  ],
  VICE_PRINCIPAL: [
    "students.view",
    "teachers.view",
    "results.view",
    "results.approve",
    "attendance.manage",
    "reports.view",
  ],
  BURSAR: ["students.view", "finance.view", "finance.record", "reports.view"],
  CASHIER: ["students.view", "finance.view", "finance.record"],
  TEACHER: ["students.view", "scores.enter", "results.view", "attendance.manage"],
  FORM_TEACHER: [
    "students.view",
    "scores.enter",
    "results.view",
    "attendance.manage",
    "reports.view",
  ],
  LIBRARIAN: ["students.view", "library.manage"],
  RECEPTIONIST: ["visitors.manage", "students.view"],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAny(role: Role | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** Throws when the current role lacks the permission — used by the service layer. */
export function assertCan(role: Role | undefined, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
}

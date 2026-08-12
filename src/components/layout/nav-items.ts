import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FileBarChart,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  Library,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  UserSquare2,
} from "lucide-react";
import type { ModuleKey } from "@/db/types";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission: Permission;
  module?: ModuleKey;
  group: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    permission: "students.view",
    group: "Overview",
  },
  {
    label: "Students",
    to: "/students",
    icon: Users,
    permission: "students.view",
    module: "students",
    group: "People",
  },
  {
    label: "Teachers",
    to: "/teachers",
    icon: UserSquare2,
    permission: "teachers.view",
    module: "teachers",
    group: "People",
  },
  {
    label: "Classes",
    to: "/classes",
    icon: GraduationCap,
    permission: "classes.manage",
    module: "academics",
    group: "Academics",
  },
  {
    label: "Subjects",
    to: "/subjects",
    icon: BookOpen,
    permission: "subjects.manage",
    module: "academics",
    group: "Academics",
  },
  {
    label: "Score Entry",
    to: "/results/entry",
    icon: ClipboardList,
    permission: "scores.enter",
    module: "results",
    group: "Academics",
  },
  {
    label: "Results",
    to: "/results",
    icon: ShieldCheck,
    permission: "results.view",
    module: "results",
    group: "Academics",
  },
  {
    label: "Attendance",
    to: "/attendance",
    icon: CalendarCheck,
    permission: "attendance.manage",
    module: "attendance",
    group: "Academics",
  },
  {
    label: "Finance",
    to: "/finance",
    icon: CreditCard,
    permission: "finance.view",
    module: "finance",
    group: "Operations",
  },
  {
    label: "Library",
    to: "/library",
    icon: Library,
    permission: "library.manage",
    module: "library",
    group: "Operations",
  },
  {
    label: "Visitors",
    to: "/visitors",
    icon: IdCard,
    permission: "visitors.manage",
    module: "visitors",
    group: "Operations",
  },
  {
    label: "ID Cards",
    to: "/id-cards",
    icon: IdCard,
    permission: "idcards.view",
    module: "idcards",
    group: "Operations",
  },
  {
    label: "Transcripts",
    to: "/transcripts",
    icon: ScrollText,
    permission: "results.view",
    module: "results",
    group: "Records",
  },
  {
    label: "Reports",
    to: "/reports",
    icon: FileBarChart,
    permission: "reports.view",
    module: "reports",
    group: "Records",
  },
  {
    label: "Audit Log",
    to: "/audit-log",
    icon: ScrollText,
    permission: "audit.view",
    group: "Records",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: SettingsIcon,
    permission: "settings.manage",
    group: "Records",
  },
];

export function useActivePath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

export { Link };

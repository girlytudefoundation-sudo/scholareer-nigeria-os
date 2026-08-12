import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/db";
import { useOrgId } from "@/lib/auth";
import { DEFAULT_GRADING, DEFAULT_MODULES, DEFAULT_RATING_SCALE } from "@/lib/constants";
import type { Settings } from "@/db/types";

export function useOrgData() {
  const orgId = useOrgId();

  const data = useLiveQuery(async () => {
    if (!orgId) return null;
    const db = getDB();
    const [
      organization,
      settings,
      students,
      classes,
      subjects,
      teachers,
      scores,
      results,
      fees,
      payments,
      attendance,
      books,
      borrowings,
      visitors,
      notifications,
      auditLogs,
      traits,
      users,
    ] = await Promise.all([
      db.organizations.get(orgId),
      db.settings.get(orgId),
      db.students.where("organizationId").equals(orgId).toArray(),
      db.classes.where("organizationId").equals(orgId).toArray(),
      db.subjects.where("organizationId").equals(orgId).toArray(),
      db.teachers.where("organizationId").equals(orgId).toArray(),
      db.scores.where("organizationId").equals(orgId).toArray(),
      db.results.where("organizationId").equals(orgId).toArray(),
      db.fees.where("organizationId").equals(orgId).toArray(),
      db.payments.where("organizationId").equals(orgId).toArray(),
      db.attendance.where("organizationId").equals(orgId).toArray(),
      db.books.where("organizationId").equals(orgId).toArray(),
      db.borrowings.where("organizationId").equals(orgId).toArray(),
      db.visitors.where("organizationId").equals(orgId).toArray(),
      db.notifications.where("organizationId").equals(orgId).toArray(),
      db.auditLogs.where("organizationId").equals(orgId).toArray(),
      db.traits.where("organizationId").equals(orgId).toArray(),
      db.users.where("organizationId").equals(orgId).toArray(),
    ]);
    return {
      organization,
      settings,
      students,
      classes,
      subjects,
      teachers,
      scores,
      results,
      fees,
      payments,
      attendance,
      books,
      borrowings,
      visitors,
      notifications,
      auditLogs,
      traits,
      users,
    };
  }, [orgId]);

  return { orgId, data, loading: data === undefined };
}

export const fallbackSettings = (orgId: string): Settings => ({
  id: orgId,
  organizationId: orgId,
  grading: DEFAULT_GRADING,
  passMark: 40,
  caMaximum: 30,
  examMaximum: 70,
  positionMethod: "COMPETITION",
  blockResultOnDebt: false,
  modules: DEFAULT_MODULES,
  ratingScale: DEFAULT_RATING_SCALE,
});

import { getDB, uid } from "@/db";
import type {
  Attendance,
  AuditLog,
  Book,
  Borrowing,
  ID,
  Notification,
  Payment,
  ResultMeta,
  SchoolClass,
  ScoreRecord,
  Settings,
  Student,
  Subject,
  Teacher,
  Visitor,
} from "@/db/types";

/** Every read is scoped by organizationId so schools never see each other's data. */
const scoped = <T extends { organizationId: ID }>(rows: T[], orgId: ID) =>
  rows.filter((r) => r.organizationId === orgId);

export const audit = async (
  orgId: ID,
  user: string,
  action: string,
  entity: string,
  entityId: string,
  details?: string,
) => {
  const log: AuditLog = {
    id: uid(),
    organizationId: orgId,
    user,
    action,
    entity,
    entityId,
    timestamp: new Date().toISOString(),
    details,
  };
  await getDB().auditLogs.add(log);
};

export const notify = async (orgId: ID, title: string, message: string, type = "info") => {
  const n: Notification = {
    id: uid(),
    organizationId: orgId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await getDB().notifications.add(n);
};

export const settingsService = {
  get: (orgId: ID) => getDB().settings.get(orgId),
  update: async (orgId: ID, patch: Partial<Settings>) => {
    await getDB().settings.update(orgId, patch);
  },
};

export const studentService = {
  list: async (orgId: ID) => scoped(await getDB().students.toArray(), orgId),
  get: (id: ID) => getDB().students.get(id),
  create: async (data: Omit<Student, "id">) => {
    const student: Student = { ...data, id: uid() };
    await getDB().students.add(student);
    return student;
  },
  update: async (id: ID, patch: Partial<Student>) => getDB().students.update(id, patch),
  remove: async (id: ID) => {
    const db = getDB();
    await db.transaction(
      "rw",
      db.students,
      db.scores,
      db.results,
      db.payments,
      db.attendance,
      async () => {
        await db.students.delete(id);
        await db.scores.where("studentId").equals(id).delete();
        await db.results.where("studentId").equals(id).delete();
        await db.payments.where("studentId").equals(id).delete();
        await db.attendance.where("studentId").equals(id).delete();
      },
    );
  },
};

export const classService = {
  list: async (orgId: ID) => scoped(await getDB().classes.toArray(), orgId),
  create: async (data: Omit<SchoolClass, "id">) => {
    const row: SchoolClass = { ...data, id: uid() };
    await getDB().classes.add(row);
    return row;
  },
  update: (id: ID, patch: Partial<SchoolClass>) => getDB().classes.update(id, patch),
  remove: (id: ID) => getDB().classes.delete(id),
};

export const subjectService = {
  list: async (orgId: ID) => scoped(await getDB().subjects.toArray(), orgId),
  create: async (data: Omit<Subject, "id">) => {
    const row: Subject = { ...data, id: uid() };
    await getDB().subjects.add(row);
    return row;
  },
  update: (id: ID, patch: Partial<Subject>) => getDB().subjects.update(id, patch),
  remove: (id: ID) => getDB().subjects.delete(id),
};

export const teacherService = {
  list: async (orgId: ID) => scoped(await getDB().teachers.toArray(), orgId),
  get: (id: ID) => getDB().teachers.get(id),
  create: async (data: Omit<Teacher, "id">) => {
    const row: Teacher = { ...data, id: uid() };
    await getDB().teachers.add(row);
    return row;
  },
  update: (id: ID, patch: Partial<Teacher>) => getDB().teachers.update(id, patch),
  remove: (id: ID) => getDB().teachers.delete(id),
};

export const scoreService = {
  list: async (orgId: ID) => scoped(await getDB().scores.toArray(), orgId),
  forClass: async (orgId: ID, classId: ID, session: string, term: string) =>
    (await getDB().scores.where("classId").equals(classId).toArray()).filter(
      (s) => s.organizationId === orgId && s.session === session && s.term === term,
    ),
  upsertMany: async (rows: ScoreRecord[]) => getDB().scores.bulkPut(rows),
};

export const resultService = {
  list: async (orgId: ID) => scoped(await getDB().results.toArray(), orgId),
  key: (studentId: ID, session: string, term: string) => `${studentId}|${session}|${term}`,
  get: (studentId: ID, session: string, term: string) =>
    getDB().results.get(`${studentId}|${session}|${term}`),
  upsert: async (row: ResultMeta) => getDB().results.put(row),
  upsertMany: async (rows: ResultMeta[]) => getDB().results.bulkPut(rows),
};

export const paymentService = {
  list: async (orgId: ID) => scoped(await getDB().payments.toArray(), orgId),
  forStudent: async (studentId: ID) =>
    getDB().payments.where("studentId").equals(studentId).toArray(),
  create: async (data: Omit<Payment, "id">) => {
    const row: Payment = { ...data, id: uid() };
    await getDB().payments.add(row);
    return row;
  },
  remove: (id: ID) => getDB().payments.delete(id),
};

export const feeService = {
  list: async (orgId: ID) => scoped(await getDB().fees.toArray(), orgId),
  create: async (data: Omit<Payment, "id"> | Record<string, unknown>) => {
    const row = { ...(data as object), id: uid() } as never;
    await getDB().fees.add(row);
    return row;
  },
  update: (id: ID, patch: Record<string, unknown>) => getDB().fees.update(id, patch as never),
  remove: (id: ID) => getDB().fees.delete(id),
};

export const attendanceService = {
  list: async (orgId: ID) => scoped(await getDB().attendance.toArray(), orgId),
  forDate: async (orgId: ID, date: string) =>
    (await getDB().attendance.where("date").equals(date).toArray()).filter(
      (a) => a.organizationId === orgId,
    ),
  upsertMany: (rows: Attendance[]) => getDB().attendance.bulkPut(rows),
};

export const libraryService = {
  books: async (orgId: ID) => scoped(await getDB().books.toArray(), orgId),
  borrowings: async (orgId: ID) => scoped(await getDB().borrowings.toArray(), orgId),
  addBook: async (data: Omit<Book, "id">) => {
    const row: Book = { ...data, id: uid() };
    await getDB().books.add(row);
    return row;
  },
  updateBook: (id: ID, patch: Partial<Book>) => getDB().books.update(id, patch),
  removeBook: (id: ID) => getDB().books.delete(id),
  borrow: async (row: Omit<Borrowing, "id">) => {
    const db = getDB();
    const book = await db.books.get(row.bookId);
    if (!book || book.available < 1) throw new Error("This book is not available for borrowing.");
    const record: Borrowing = { ...row, id: uid() };
    await db.transaction("rw", db.books, db.borrowings, async () => {
      await db.books.update(book.id, { available: book.available - 1 });
      await db.borrowings.add(record);
    });
    return record;
  },
  giveBack: async (borrowId: ID) => {
    const db = getDB();
    const rec = await db.borrowings.get(borrowId);
    if (!rec || rec.status === "RETURNED") return;
    const book = await db.books.get(rec.bookId);
    await db.transaction("rw", db.books, db.borrowings, async () => {
      if (book) await db.books.update(book.id, { available: book.available + 1 });
      await db.borrowings.update(borrowId, {
        status: "RETURNED",
        returnedAt: new Date().toISOString(),
      });
    });
  },
};

export const visitorService = {
  list: async (orgId: ID) => scoped(await getDB().visitors.toArray(), orgId),
  create: async (data: Omit<Visitor, "id">) => {
    const row: Visitor = { ...data, id: uid() };
    await getDB().visitors.add(row);
    return row;
  },
  checkOut: (id: ID) =>
    getDB().visitors.update(id, { status: "OUT", timeOut: new Date().toISOString() }),
};

export const notificationService = {
  list: async (orgId: ID) => scoped(await getDB().notifications.toArray(), orgId),
  markAllRead: async (orgId: ID) => {
    const rows = await notificationService.list(orgId);
    await getDB().notifications.bulkPut(rows.map((n) => ({ ...n, read: true })));
  },
};

export const auditService = {
  list: async (orgId: ID) => scoped(await getDB().auditLogs.toArray(), orgId),
};

/** Fee + payment maths — the single source of truth for balances. */
export function balanceFor(
  studentId: ID,
  classId: ID,
  fees: { classId: ID; session: string; term: string; amount: number }[],
  payments: Payment[],
  session: string,
  term: string,
) {
  const totalFees = fees
    .filter((f) => f.classId === classId && f.session === session && f.term === term)
    .reduce((a, b) => a + b.amount, 0);
  const paid = payments
    .filter((p) => p.studentId === studentId && p.session === session && p.term === term)
    .reduce((a, b) => a + b.amount, 0);
  const balance = Math.max(totalFees - paid, 0);
  const status: "PAID" | "PARTIAL" | "OWING" =
    totalFees > 0 && paid >= totalFees ? "PAID" : paid > 0 ? "PARTIAL" : "OWING";
  return { totalFees, paid, balance, status };
}

import { getDB, uid } from "@/db";
import {
  AFFECTIVE_TRAITS,
  DEFAULT_ASSESSMENT,
  DEFAULT_GRADING,
  DEFAULT_MODULES,
  DEFAULT_RATING_SCALE,
  PSYCHOMOTOR_TRAITS,
} from "@/lib/constants";
import type {
  Attendance,
  Book,
  Borrowing,
  FeeStructure,
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
} from "@/db/types";

export const DEMO_ORG_ID = "org-asac";
const SESSION = "2025/2026";
const TERM = "First Term";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function isSeeded() {
  const db = getDB();
  return (await db.organizations.count()) > 0;
}

export async function ensureSuperAdmin() {
  const db = getDB();
  const existing = await db.users.where("email").equals("superadmin@scholareer.local").first();
  if (!existing) {
    await db.users.add({
      id: uid(),
      name: "System Administrator",
      email: "superadmin@scholareer.local",
      password: "Admin123!",
      role: "SUPER_ADMIN",
      organizationId: null,
      status: "ACTIVE",
    });
  }
}

export async function resetDemo() {
  const db = getDB();
  await Promise.all(db.tables.map((t) => t.clear()));
  await seedDemoSchool();
}

/** Seeds the All Saints Anglican College demo school. Never overwrites existing data. */
export async function seedDemoSchool() {
  const db = getDB();
  await ensureSuperAdmin();
  const existing = await db.organizations.get(DEMO_ORG_ID);
  if (existing) return;

  const org: Organization = {
    id: DEMO_ORG_ID,
    name: "All Saints Anglican College",
    schoolCode: "ASAC001",
    address: "17 Cathedral Road, Ikeja, Lagos",
    phone: "+234 803 555 0142",
    email: "info@allsaintscollege.ng",
    principalName: "Mrs. Adaeze Okonkwo",
    proprietorName: "Ven. Emeka Nwachukwu",
    motto: "Knowledge, Character, Service",
    state: "Lagos",
    country: "Nigeria",
    currentSession: SESSION,
    currentTerm: TERM,
    resumptionDate: iso(new Date(new Date().getFullYear(), 8, 9)),
  };

  const settings: Settings = {
    id: DEMO_ORG_ID,
    organizationId: DEMO_ORG_ID,
    grading: DEFAULT_GRADING,
    passMark: 40,
    caMaximum: 30,
    examMaximum: 70,
    assessment: DEFAULT_ASSESSMENT,
    positionMethod: "COMPETITION",
    blockResultOnDebt: false,
    modules: DEFAULT_MODULES,
    ratingScale: DEFAULT_RATING_SCALE,
  };

  const classDefs: [string, SchoolClass["level"], string][] = [
    ["JSS 1A", "JSS", "A"],
    ["JSS 1B", "JSS", "B"],
    ["JSS 2A", "JSS", "A"],
    ["SS 1A", "SSS", "A"],
    ["SS 2A", "SSS", "A"],
  ];
  const classes: SchoolClass[] = classDefs.map(([name, level, arm], i) => ({
    id: `cls-${i + 1}`,
    name,
    level,
    arm,
    organizationId: DEMO_ORG_ID,
  }));

  const subjectDefs = [
    ["English Language", "ENG", "Core"],
    ["Mathematics", "MTH", "Core"],
    ["Biology", "BIO", "Science"],
    ["Physics", "PHY", "Science"],
    ["Chemistry", "CHM", "Science"],
    ["Economics", "ECO", "Commercial"],
    ["Government", "GOV", "Arts"],
  ];
  const subjects: Subject[] = subjectDefs.map(([subjectName, subjectCode, category], i) => ({
    id: `sub-${i + 1}`,
    subjectName: subjectName as string,
    subjectCode: subjectCode as string,
    category: category as string,
    maximumScore: 100,
    caMaximum: 30,
    examMaximum: 70,
    passMark: 40,
    gradingScheme: "Default",
    classIds: classes.map((c) => c.id),
    organizationId: DEMO_ORG_ID,
  }));

  const teacherDefs = [
    ["Chidi", "Balogun", "MALE", "B.Ed English"],
    ["Ngozi", "Adeyemi", "FEMALE", "B.Sc Mathematics"],
    ["Samuel", "Eze", "MALE", "B.Sc Biology"],
    ["Funmi", "Oladipo", "FEMALE", "M.Sc Physics"],
    ["Tunde", "Ibrahim", "MALE", "B.Sc Economics"],
  ];
  const teachers: Teacher[] = teacherDefs.map(([first, last, gender, qual], i) => ({
    id: `tch-${i + 1}`,
    staffId: `ASAC/STF/${(i + 1).toString().padStart(3, "0")}`,
    firstName: first as string,
    lastName: last as string,
    gender: gender as Teacher["gender"],
    phone: `+234 80${i}3 555 01${i}9`,
    email: `${(first as string).toLowerCase()}.${(last as string).toLowerCase()}@asac.local`,
    qualification: qual as string,
    subjectIds: [subjects[i]?.id ?? "sub-1"],
    classIds: classes.map((c) => c.id),
    formClassId: classes[i]?.id,
    status: "ACTIVE",
    organizationId: DEMO_ORG_ID,
  }));

  const studentDefs = [
    ["Blessing", "Chioma", "Okafor", "FEMALE", "cls-1"],
    ["Daniel", "Obinna", "Uche", "MALE", "cls-1"],
    ["Aisha", "Zainab", "Bello", "FEMALE", "cls-2"],
    ["Emeka", "Kelechi", "Nwosu", "MALE", "cls-3"],
    ["Tolu", "Ayomide", "Adebayo", "FEMALE", "cls-4"],
  ];
  const students: Student[] = studentDefs.map(([first, mid, last, gender, classId], i) => ({
    id: `std-${i + 1}`,
    admissionNumber: `ASAC/2025/${(i + 1).toString().padStart(4, "0")}`,
    firstName: first as string,
    middleName: mid as string,
    lastName: last as string,
    gender: gender as Student["gender"],
    dateOfBirth: `201${i + 1}-0${(i % 8) + 1}-1${i}`,
    parentName: `Mr. & Mrs. ${last}`,
    parentPhone: `+234 81${i} 555 02${i}4`,
    parentEmail: `parent${i + 1}@mail.com`,
    address: `${i + 5} Ogunlana Drive, Lagos`,
    classId: classId as string,
    arm: classes.find((c) => c.id === classId)?.arm ?? "A",
    house: ["Red", "Blue", "Green", "Yellow", "Red"][i] as string,
    admissionDate: "2025-09-09",
    status: "ACTIVE",
    organizationId: DEMO_ORG_ID,
  }));

  const users: User[] = [
    {
      id: uid(),
      name: "Adaeze Okonkwo",
      email: "admin@asac.local",
      password: "Admin123!",
      role: "SCHOOL_ADMIN",
      organizationId: DEMO_ORG_ID,
      status: "ACTIVE",
    },
    {
      id: uid(),
      name: "Grace Umeh",
      email: "cashier@asac.local",
      password: "Admin123!",
      role: "CASHIER",
      organizationId: DEMO_ORG_ID,
      status: "ACTIVE",
    },
    {
      id: uid(),
      name: "Chidi Balogun",
      email: "teacher@asac.local",
      password: "Admin123!",
      role: "TEACHER",
      organizationId: DEMO_ORG_ID,
      teacherId: "tch-1",
      status: "ACTIVE",
    },
    {
      id: uid(),
      name: "Mrs. Adaeze Okonkwo",
      email: "principal@asac.local",
      password: "Admin123!",
      role: "PRINCIPAL",
      organizationId: DEMO_ORG_ID,
      status: "ACTIVE",
    },
  ];

  const traits: TraitConfig[] = [
    ...AFFECTIVE_TRAITS.map((name) => ({
      id: uid(),
      name,
      domain: "AFFECTIVE" as const,
      organizationId: DEMO_ORG_ID,
    })),
    ...PSYCHOMOTOR_TRAITS.map((name) => ({
      id: uid(),
      name,
      domain: "PSYCHOMOTOR" as const,
      organizationId: DEMO_ORG_ID,
    })),
  ];

  const fees: FeeStructure[] = classes.map((c, i) => ({
    id: uid(),
    organizationId: DEMO_ORG_ID,
    classId: c.id,
    session: SESSION,
    term: TERM,
    title: `${c.name} ${TERM} Fees`,
    amount: 100000 + i * 15000,
  }));

  // Scores — realistic spread so positions differ meaningfully
  const scores: ScoreRecord[] = [];
  students.forEach((s, si) => {
    subjects.forEach((sub, bi) => {
      const base = 40 + ((si * 7 + bi * 11) % 45);
      scores.push({
        id: `${s.id}|${sub.id}|${SESSION}|${TERM}`,
        organizationId: DEMO_ORG_ID,
        studentId: s.id,
        classId: s.classId,
        subjectId: sub.id,
        session: SESSION,
        term: TERM,
        ca1: Math.min(DEFAULT_ASSESSMENT.ca1Max, Math.round(base * 0.15)),
        ca2: Math.min(DEFAULT_ASSESSMENT.ca2Max, Math.round(base * 0.14)),
        ca3: 0,
        exam: Math.min(DEFAULT_ASSESSMENT.examMax, Math.round(base * 0.7)),
        status: si < 3 ? "SUBMITTED" : "DRAFT",
        enteredBy: "Chidi Balogun",
        updatedAt: new Date().toISOString(),
      });
    });
  });

  const results: ResultMeta[] = students.map((s, i) => ({
    id: `${s.id}|${SESSION}|${TERM}`,
    organizationId: DEMO_ORG_ID,
    studentId: s.id,
    classId: s.classId,
    session: SESSION,
    term: TERM,
    status: i < 2 ? "APPROVED" : i < 3 ? "SUBMITTED" : "DRAFT",
    accessBlocked: i === 2,
    blockReason: i === 2 ? "Blocked manually by administrator" : undefined,
    manualOverride: i === 2 ? "BLOCK" : null,
    teacherComment: "A promising student who can do even better.",
    principalComment: "Keep up the good work.",
    traits: Object.fromEntries(traits.map((t) => [t.id, 3 + (i % 3)])),
    affective: Object.fromEntries(AFFECTIVE_TRAITS.map((t, k) => [t, 3 + ((i + k) % 3)])),
    psychomotor: Object.fromEntries(PSYCHOMOTOR_TRAITS.map((t, k) => [t, 3 + ((i + k) % 3)])),
    updatedAt: new Date().toISOString(),
  }));

  const payments: Payment[] = [];
  const payDefs: [number, number][] = [
    [0, 1],
    [1, 0.5],
    [2, 0],
    [3, 1],
    [4, 0.35],
  ];
  payDefs.forEach(([si, ratio], i) => {
    const student = students[si];
    if (!student || ratio === 0) return;
    const fee = fees.find((f) => f.classId === student.classId);
    payments.push({
      id: uid(),
      organizationId: DEMO_ORG_ID,
      receiptNumber: `RCP-${1000 + i}`,
      studentId: student.id,
      session: SESSION,
      term: TERM,
      amount: Math.round((fee?.amount ?? 100000) * ratio),
      date: iso(new Date(Date.now() - i * 86400000 * 3)),
      method: (["CASH", "POS", "BANK_TRANSFER", "ONLINE"] as const)[i % 4] ?? "CASH",
      reference: `REF${9000 + i}`,
      description: `${TERM} school fees`,
      cashier: "Grace Umeh",
    });
  });

  const attendance: Attendance[] = [];
  for (let d = 0; d < 10; d++) {
    const day = new Date(Date.now() - d * 86400000);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const date = iso(day);
    students.forEach((s, si) => {
      const st: Attendance["status"] =
        (si + d) % 9 === 0 ? "ABSENT" : (si + d) % 7 === 0 ? "LATE" : "PRESENT";
      attendance.push({
        id: `${s.id}|${date}`,
        organizationId: DEMO_ORG_ID,
        studentId: s.id,
        classId: s.classId,
        date,
        status: st,
      });
    });
  }

  const books: Book[] = [
    ["9789780292072", "Things Fall Apart", "Chinua Achebe", "Literature", 12],
    ["9789780291234", "New General Mathematics JSS1", "M.F. Macrae", "Mathematics", 20],
    ["9789780293344", "Essential Biology", "M.C. Michael", "Science", 15],
    ["9789780294455", "The Lion and the Jewel", "Wole Soyinka", "Literature", 8],
    ["9789780295566", "Comprehensive Government", "F. Ibiam", "Arts", 10],
  ].map(([isbn, title, author, category, qty]) => ({
    id: uid(),
    organizationId: DEMO_ORG_ID,
    isbn: isbn as string,
    title: title as string,
    author: author as string,
    category: category as string,
    quantity: qty as number,
    available: (qty as number) - 1,
  }));

  const borrowings: Borrowing[] = books.slice(0, 2).map((b, i) => ({
    id: uid(),
    organizationId: DEMO_ORG_ID,
    studentId: students[i]?.id ?? "std-1",
    bookId: b.id,
    borrowedAt: iso(new Date(Date.now() - (i + 5) * 86400000)),
    dueDate: iso(new Date(Date.now() + (i === 0 ? -2 : 7) * 86400000)),
    status: "BORROWED",
  }));

  const visitors: Visitor[] = [
    {
      id: uid(),
      organizationId: DEMO_ORG_ID,
      name: "Mrs. Ifeoma Okafor",
      phone: "+234 802 555 7788",
      purpose: "Parent-teacher meeting",
      personToVisit: "Form Teacher JSS 1A",
      idType: "National ID",
      idNumber: "NIN-2938471",
      timeIn: new Date(Date.now() - 3600000).toISOString(),
      status: "IN",
    },
    {
      id: uid(),
      organizationId: DEMO_ORG_ID,
      name: "Mr. Sola Adeniyi",
      phone: "+234 806 555 3321",
      purpose: "Book supply delivery",
      personToVisit: "Librarian",
      idType: "Driver's Licence",
      idNumber: "DL-77321",
      timeIn: new Date(Date.now() - 7200000).toISOString(),
      timeOut: new Date(Date.now() - 5400000).toISOString(),
      status: "OUT",
    },
  ];

  await db.transaction("rw", db.tables, async () => {
    await db.organizations.put(org);
    await db.settings.put(settings);
    await db.classes.bulkPut(classes);
    await db.subjects.bulkPut(subjects);
    await db.teachers.bulkPut(teachers);
    await db.students.bulkPut(students);
    await db.users.bulkPut(users);
    await db.traits.bulkPut(traits);
    await db.fees.bulkPut(fees);
    await db.scores.bulkPut(scores);
    await db.results.bulkPut(results);
    await db.payments.bulkPut(payments);
    await db.attendance.bulkPut(attendance);
    await db.books.bulkPut(books);
    await db.borrowings.bulkPut(borrowings);
    await db.visitors.bulkPut(visitors);
    await db.notifications.bulkPut([
      {
        id: uid(),
        organizationId: DEMO_ORG_ID,
        title: "Results awaiting approval",
        message: "1 result has been submitted and is awaiting principal approval.",
        type: "result",
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(),
        organizationId: DEMO_ORG_ID,
        title: "Payment recorded",
        message: "A new school fees payment was recorded by the cashier.",
        type: "payment",
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(),
        organizationId: DEMO_ORG_ID,
        title: "Library overdue",
        message: "1 borrowed book is overdue and should be recalled.",
        type: "library",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  });
}

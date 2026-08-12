import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgData } from "@/hooks/use-data";
import { balanceFor } from "@/services";
import { naira } from "@/lib/constants";
import { computeClassResults, ordinal } from "@/lib/result-engine";

export const Route = createFileRoute("/_shell/students/$studentId")({
  head: () => ({
    meta: [
      { title: "Student profile — Scholareer School OS" },
      { name: "description", content: "Full student profile, results, fees and attendance." },
      { property: "og:title", content: "Student profile — Scholareer School OS" },
      { property: "og:description", content: "Bio-data, academics, payments and attendance." },
    ],
  }),
  component: StudentProfile,
});

function StudentProfile() {
  const { studentId } = Route.useParams();
  const { data } = useOrgData();

  const view = useMemo(() => {
    if (!data?.organization) return null;
    const student = data.students.find((s) => s.id === studentId);
    if (!student) return null;
    const org = data.organization;
    const cls = data.classes.find((c) => c.id === student.classId);
    const classmates = data.students.filter(
      (s) => s.classId === student.classId && s.status === "ACTIVE",
    );
    const scores = data.scores.filter(
      (s) =>
        s.classId === student.classId &&
        s.session === org.currentSession &&
        s.term === org.currentTerm,
    );
    const aggregates = computeClassResults(
      scores,
      classmates.map((s) => s.id),
      {
        grading: data.settings?.grading ?? [],
        positionMethod: data.settings?.positionMethod ?? "COMPETITION",
      },
    );
    const mine = aggregates.find((a) => a.studentId === student.id);
    const balance = balanceFor(
      student.id,
      student.classId,
      data.fees,
      data.payments,
      org.currentSession,
      org.currentTerm,
    );
    const payments = data.payments
      .filter((p) => p.studentId === student.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const attendance = data.attendance.filter((a) => a.studentId === student.id);
    const present = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const borrowings = data.borrowings.filter((b) => b.studentId === student.id);
    return {
      student,
      cls,
      mine,
      balance,
      payments,
      attendance,
      present,
      borrowings,
      subjects: data.subjects,
      books: data.books,
    };
  }, [data, studentId]);

  if (!view) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="font-medium">Student not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/students">Back to students</Link>
        </Button>
      </div>
    );
  }

  const s = view.student;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/students">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All students
        </Link>
      </Button>
      <PageHeader
        title={`${s.firstName} ${s.middleName ?? ""} ${s.lastName}`.replace(/\s+/g, " ")}
        description={`${s.admissionNumber} · ${view.cls?.name ?? "Unassigned"}`}
        actions={<Badge variant="secondary">{s.status}</Badge>}
      />

      <Tabs defaultValue="bio">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="bio">Bio-data</TabsTrigger>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        <TabsContent value="bio">
          <div className="surface-card grid gap-4 p-5 sm:grid-cols-2">
            {[
              ["Admission number", s.admissionNumber],
              ["Gender", s.gender === "MALE" ? "Male" : "Female"],
              ["Date of birth", s.dateOfBirth || "—"],
              ["Admission date", s.admissionDate],
              ["Class / Arm", `${view.cls?.name ?? "—"} · ${s.arm}`],
              ["House", s.house ?? "—"],
              ["Parent / guardian", s.parentName],
              ["Parent phone", s.parentPhone],
              ["Parent email", s.parentEmail ?? "—"],
              ["Address", s.address ?? "—"],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
                <p className="mt-0.5 text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="academics">
          <div className="surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>CA</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(view.mine?.subjects ?? []).map((sub) => (
                  <TableRow key={sub.subjectId}>
                    <TableCell className="font-medium">
                      {view.subjects.find((x) => x.id === sub.subjectId)?.subjectName ?? "—"}
                    </TableCell>
                    <TableCell>{sub.ca}</TableCell>
                    <TableCell>{sub.exam}</TableCell>
                    <TableCell className="font-semibold">{sub.total}</TableCell>
                    <TableCell>{sub.grade}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.remark}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Info label="Total score" value={view.mine?.total ?? 0} />
            <Info label="Average" value={`${view.mine?.average ?? 0}%`} />
            <Info
              label="Position"
              value={`${ordinal(view.mine?.position ?? 0)} of ${view.mine?.outOf ?? 0}`}
            />
          </div>
        </TabsContent>

        <TabsContent value="finance">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Info label="Total fees" value={naira(view.balance.totalFees)} />
            <Info label="Paid" value={naira(view.balance.paid)} />
            <Info label="Balance" value={naira(view.balance.balance)} />
          </div>
          <div className="surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                    <TableCell>{p.date}</TableCell>
                    <TableCell>{p.term}</TableCell>
                    <TableCell>{p.method.replace("_", " ")}</TableCell>
                    <TableCell className="text-right font-medium">{naira(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Info label="Days recorded" value={view.attendance.length} />
            <Info label="Days present" value={view.present} />
            <Info
              label="Attendance rate"
              value={`${
                view.attendance.length
                  ? Math.round((view.present / view.attendance.length) * 100)
                  : 0
              }%`}
            />
          </div>
          <div className="surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...view.attendance]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 40)
                  .map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "ABSENT" ? "destructive" : "secondary"}>
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="library">
          <div className="surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrowed</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.borrowings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      {view.books.find((x) => x.id === b.bookId)?.title ?? "—"}
                    </TableCell>
                    <TableCell>{b.borrowedAt.slice(0, 10)}</TableCell>
                    <TableCell>{b.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "BORROWED" ? "outline" : "secondary"}>
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}

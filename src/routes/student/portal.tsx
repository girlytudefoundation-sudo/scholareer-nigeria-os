import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  FileDown,
  GraduationCap,
  Loader2,
  LogOut,
  Printer,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/common/stat-card";
import { StudentAvatar } from "@/components/students/student-avatar";
import { ReportSheet, printReport } from "@/components/results/report-sheet";
import { ordinal } from "@/lib/result-engine";
import {
  clearStudentSession,
  listStudentTerms,
  loadStudentResult,
  readStudentSession,
  resolveStudentSession,
  studentTrend,
  type StudentPortalResult,
  type StudentSession,
  type TermKey,
  type TermTrend,
} from "@/lib/student-portal";
import type { Student } from "@/db/types";

export const Route = createFileRoute("/student/portal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Results — Student Result Checker | Scholareer" },
      {
        name: "description",
        content:
          "View your own term results, academic analytics and print your official report card.",
      },
      { property: "og:title", content: "My Results — Student Result Checker" },
      {
        property: "og:description",
        content: "Your term result, analytics and printable report card.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentPortalPage,
});

function StudentPortalPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<StudentSession | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [terms, setTerms] = useState<TermKey[]>([]);
  const [pick, setPick] = useState<TermKey | null>(null);
  const [result, setResult] = useState<StudentPortalResult | null>(null);
  const [trend, setTrend] = useState<TermTrend[]>([]);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    clearStudentSession();
    navigate({ to: "/student", replace: true });
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const stored = readStudentSession();
      const found = await resolveStudentSession(stored);
      if (!stored || !found) {
        clearStudentSession();
        await navigate({ to: "/student", replace: true });
        return;
      }
      setSession(stored);
      setStudent(found);
      const available = await listStudentTerms(found.id);
      setTerms(available);
      setPick(available[available.length - 1] ?? null);
      setTrend(await studentTrend(stored));
      setLoading(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!session || !pick) return;
    let active = true;
    (async () => {
      const res = await loadStudentResult(session, pick.session, pick.term);
      if (active) setResult(res);
    })();
    return () => {
      active = false;
    };
  }, [session, pick]);

  const analytics = useMemo(() => {
    const subjects = result?.data?.agg.subjects ?? [];
    if (!result?.data || subjects.length < 2) return null;
    const named = subjects.map((s) => ({
      ...s,
      name: result.data!.subjects.find((x) => x.id === s.subjectId)?.subjectName ?? "Subject",
    }));
    const sorted = [...named].sort((a, b) => b.total - a.total);
    const grades = named.reduce<Record<string, number>>((acc, s) => {
      acc[s.grade] = (acc[s.grade] ?? 0) + 1;
      return acc;
    }, {});
    return {
      named,
      best: sorted[0]!,
      worst: sorted[sorted.length - 1]!,
      grades: Object.entries(grades).sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [result]);

  if (loading || !student) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const data = result?.data;
  const blockedMessage =
    result && result.access !== "ALLOWED"
      ? (result.message ?? "Result is not available.")
      : null;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-xl">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-display truncate text-sm font-extrabold">Result Checker</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {student.admissionNumber}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        {/* Identity */}
        <section className="surface-card flex flex-wrap items-center gap-4 p-4">
          <StudentAvatar
            firstName={student.firstName}
            lastName={student.lastName}
            src={student.passport}
            className="h-16 w-16 text-lg"
          />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-extrabold tracking-tight">
              {`${student.firstName} ${student.middleName ?? ""} ${student.lastName}`.replace(
                /\s+/g,
                " ",
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Reg. No. {student.admissionNumber} · Class {data?.cls?.name ?? "—"} / Arm{" "}
              {student.arm || "—"}
            </p>
            {pick && (
              <p className="text-sm text-muted-foreground">
                {pick.term}, {pick.session}
              </p>
            )}
          </div>
        </section>

        {/* Term selection */}
        <section className="surface-card grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Academic session</Label>
            <Select
              value={pick?.session ?? ""}
              onValueChange={(v) => {
                const first = terms.find((t) => t.session === v);
                if (first) setPick(first);
              }}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set(terms.map((t) => t.session))].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Term</Label>
            <Select
              value={pick?.term ?? ""}
              onValueChange={(v) => pick && setPick({ session: pick.session, term: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms
                  .filter((t) => t.session === pick?.session)
                  .map((t) => (
                    <SelectItem key={t.term} value={t.term}>
                      {t.term}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {terms.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              No results have been recorded for you yet.
            </p>
          )}
        </section>

        {blockedMessage && (
          <section className="surface-card flex items-start gap-3 border-destructive/40 p-5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold">Result unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">{blockedMessage}</p>
            </div>
          </section>
        )}

        {data && (
          <>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button size="sm" onClick={printReport}>
                <Printer className="mr-1.5 h-4 w-4" /> Print result
              </Button>
              <Button size="sm" variant="outline" onClick={printReport}>
                <FileDown className="mr-1.5 h-4 w-4" /> Save as PDF
              </Button>
            </div>

            {/* Overall result */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Total score" value={data.agg.total} tone="primary" />
              <StatCard label="Average" value={`${data.agg.average}%`} tone="success" />
              <StatCard
                label="Position"
                value={ordinal(data.agg.position)}
                hint={`Out of ${data.agg.outOf} students`}
              />
              <StatCard
                label="Subjects"
                value={data.agg.subjects.length}
                hint={`Status: ${data.status}`}
              />
            </section>

            {/* Subject results */}
            <section className="surface-card overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>CA1 ({data.assessment.ca1Max})</TableHead>
                    <TableHead>CA2 ({data.assessment.ca2Max})</TableHead>
                    <TableHead>Exam ({data.assessment.examMax})</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.agg.subjects.map((sub) => (
                    <TableRow key={sub.subjectId}>
                      <TableCell className="font-medium">
                        {data.subjects.find((x) => x.id === sub.subjectId)?.subjectName ?? "—"}
                      </TableCell>
                      <TableCell>{sub.ca1}</TableCell>
                      <TableCell>{sub.ca2}</TableCell>
                      <TableCell>{sub.exam}</TableCell>
                      <TableCell className="font-semibold">{sub.total}</TableCell>
                      <TableCell>{sub.grade}</TableCell>
                      <TableCell>{sub.remark}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            {/* Analytics */}
            <section className="surface-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-primary" /> Academic analytics
              </p>
              {!analytics ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Not enough data available for analytics.
                </p>
              ) : (
                <div className="mt-3 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Fact label="Overall average" value={`${data.agg.average}%`} />
                    <Fact
                      label="Highest subject"
                      value={`${analytics.best.name} (${analytics.best.total})`}
                    />
                    <Fact
                      label="Lowest subject"
                      value={`${analytics.worst.name} (${analytics.worst.total})`}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Grade spread
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analytics.grades.map(([g, n]) => (
                        <span key={g} className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                          {g}: {n}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Subject by subject
                    </p>
                    <div className="space-y-1.5">
                      {analytics.named.map((s) => (
                        <div key={s.subjectId} className="flex items-center gap-2">
                          <span className="w-32 shrink-0 truncate text-xs">{s.name}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(s.total, 100)}%` }}
                            />
                          </span>
                          <span className="w-10 text-right text-xs font-semibold">{s.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {trend.length > 1 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Previous terms
                      </p>
                      <div className="space-y-1 text-sm">
                        {trend.map((t) => (
                          <div
                            key={`${t.session}|${t.term}`}
                            className="flex justify-between border-b py-1 last:border-0"
                          >
                            <span className="text-muted-foreground">
                              {t.term}, {t.session}
                            </span>
                            <span className="font-semibold">{t.average}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Official A4 report — reused from the school report card system */}
            <ReportSheet
              org={data.org}
              student={data.student}
              cls={data.cls}
              agg={data.agg}
              subjects={data.subjects}
              assessment={data.assessment}
              attendance={data.attendance}
              affective={data.affective}
              psychomotor={data.psychomotor}
              teacherComment={data.teacherComment}
              principalComment={data.principalComment}
              session={data.session}
              term={data.term}
            />
          </>
        )}
      </main>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold break-words">{value}</p>
    </div>
  );
}

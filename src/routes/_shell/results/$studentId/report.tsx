import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrgData } from "@/hooks/use-data";
import { computeClassResults, ordinal } from "@/lib/result-engine";
import { printElement } from "@/lib/csv";

export const Route = createFileRoute("/_shell/results/$studentId/report")({
  head: () => ({
    meta: [
      { title: "Report Card — Scholareer School OS" },
      { name: "description", content: "Printable termly report card with grades and position." },
      { property: "og:title", content: "Report Card — Scholareer School OS" },
      { property: "og:description", content: "A4-ready student report sheet." },
    ],
  }),
  component: ReportCard,
});

function ReportCard() {
  const { studentId } = Route.useParams();
  const { data } = useOrgData();

  const view = useMemo(() => {
    if (!data?.organization) return null;
    const org = data.organization;
    const student = data.students.find((s) => s.id === studentId);
    if (!student) return null;
    const classmates = data.students.filter(
      (s) => s.classId === student.classId && s.status === "ACTIVE",
    );
    const scores = data.scores.filter(
      (s) =>
        s.classId === student.classId &&
        s.session === org.currentSession &&
        s.term === org.currentTerm,
    );
    const aggs = computeClassResults(
      scores,
      classmates.map((s) => s.id),
      {
        grading: data.settings?.grading ?? [],
        positionMethod: data.settings?.positionMethod ?? "COMPETITION",
      },
    );
    const meta = data.results.find(
      (r) =>
        r.studentId === student.id &&
        r.session === org.currentSession &&
        r.term === org.currentTerm,
    );
    return {
      org,
      student,
      cls: data.classes.find((c) => c.id === student.classId),
      agg: aggs.find((a) => a.studentId === student.id),
      subjects: data.subjects,
      meta,
    };
  }, [data, studentId]);

  if (!view) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="font-medium">Report card unavailable</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/results">Back to results</Link>
        </Button>
      </div>
    );
  }

  if (view.meta?.accessBlocked) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="font-medium">Result access is blocked</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {view.meta.blockReason ?? "Outstanding school fees must be cleared to view this result."}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/results">Back to results</Link>
        </Button>
      </div>
    );
  }

  const s = view.student;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/results">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to results
          </Link>
        </Button>
        <Button size="sm" onClick={() => printElement("report-card", "Report Card")}>
          <Printer className="mr-1.5 h-4 w-4" /> Print
        </Button>
      </div>

      <div id="report-card" className="surface-card mx-auto max-w-3xl p-6">
        <header className="border-b pb-4 text-center">
          <h1 className="font-display text-xl font-extrabold uppercase">{view.org.name}</h1>
          <p className="text-xs text-muted-foreground">{view.org.address}</p>
          <p className="text-xs text-muted-foreground">
            {view.org.phone} · {view.org.email}
          </p>
          <p className="mt-2 text-sm font-semibold">
            Termly Report Sheet — {view.org.currentTerm}, {view.org.currentSession}
          </p>
        </header>

        <section className="grid gap-2 border-b py-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Name:</span>{" "}
            <span className="font-medium">
              {s.lastName}, {s.firstName} {s.middleName ?? ""}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Admission No:</span>{" "}
            <span className="font-medium">{s.admissionNumber}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Class:</span>{" "}
            <span className="font-medium">{view.cls?.name ?? "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Position:</span>{" "}
            <span className="font-medium">
              {ordinal(view.agg?.position ?? 0)} of {view.agg?.outOf ?? 0}
            </span>
          </p>
        </section>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">Subject</th>
              <th>CA</th>
              <th>Exam</th>
              <th>Total</th>
              <th>Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {(view.agg?.subjects ?? []).map((sub) => (
              <tr key={sub.subjectId} className="border-b">
                <td className="py-1.5">
                  {view.subjects.find((x) => x.id === sub.subjectId)?.subjectName ?? "—"}
                </td>
                <td>{sub.ca}</td>
                <td>{sub.exam}</td>
                <td className="font-semibold">{sub.total}</td>
                <td>{sub.grade}</td>
                <td className="text-muted-foreground">{sub.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <p>
            <span className="text-muted-foreground">Total:</span>{" "}
            <span className="font-semibold">{view.agg?.total ?? 0}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Average:</span>{" "}
            <span className="font-semibold">{view.agg?.average ?? 0}%</span>
          </p>
          <p>
            <span className="text-muted-foreground">Subjects:</span>{" "}
            <span className="font-semibold">{view.agg?.subjects.length ?? 0}</span>
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Form teacher's comment:</span>{" "}
            {view.meta?.teacherComment ?? "A good result. Keep it up."}
          </p>
          <p>
            <span className="text-muted-foreground">Principal's comment:</span>{" "}
            {view.meta?.principalComment ?? "Promoted to the next class."}
          </p>
          <p className="pt-6 text-xs text-muted-foreground">
            {view.org.principalName}, Principal · Next term begins {view.org.resumptionDate}
          </p>
        </section>
      </div>
    </div>
  );
}

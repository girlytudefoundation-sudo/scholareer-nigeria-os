import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download, GraduationCap, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgData, fallbackSettings } from "@/hooks/use-data";
import { balanceFor } from "@/services";
import { computeClassResults } from "@/lib/result-engine";
import { naira } from "@/lib/constants";
import { downloadCSV, toCSV } from "@/lib/csv";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Scholareer School OS" },
      { name: "description", content: "Enrolment, academic and financial reports for school leadership." },
      { property: "og:title", content: "Reports — Scholareer School OS" },
      { property: "og:description", content: "Class-by-class performance, attendance and revenue insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, orgId } = useOrgData();
  const org = data?.organization;
  const session = org?.currentSession ?? "";
  const term = org?.currentTerm ?? "";
  const settings = data?.settings ?? (orgId ? fallbackSettings(orgId) : null);

  const students = data?.students ?? [];
  const classes = data?.classes ?? [];
  const scores = data?.scores ?? [];
  const attendance = data?.attendance ?? [];

  const rows = useMemo(() => {
    if (!settings) return [];
    return classes.map((c) => {
      const enrolled = students.filter((s) => s.classId === c.id && s.status === "ACTIVE");
      const classScores = scores.filter(
        (s) => s.classId === c.id && s.session === session && s.term === term,
      );
      const aggregates = computeClassResults(
        classScores,
        enrolled.map((s) => s.id),
        settings,
      );
      const withScores = aggregates.filter((a) => a.subjects.length > 0);
      const average = withScores.length
        ? Math.round((withScores.reduce((a, b) => a + b.average, 0) / withScores.length) * 100) / 100
        : 0;
      const pass = withScores.filter((a) => a.average >= settings.passMark).length;
      const ledger = enrolled.map((s) =>
        balanceFor(s.id, s.classId, data?.fees ?? [], data?.payments ?? [], session, term),
      );
      const att = attendance.filter((a) => a.classId === c.id);
      const present = att.filter((a) => a.status === "PRESENT").length;
      return {
        classId: c.id,
        className: c.name,
        enrolled: enrolled.length,
        average,
        passRate: withScores.length ? Math.round((pass / withScores.length) * 100) : 0,
        expected: ledger.reduce((a, b) => a + b.totalFees, 0),
        collected: ledger.reduce((a, b) => a + b.paid, 0),
        outstanding: ledger.reduce((a, b) => a + b.balance, 0),
        attendanceRate: att.length ? Math.round((present / att.length) * 100) : 0,
      };
    });
  }, [classes, students, scores, attendance, settings, session, term, data?.fees, data?.payments]);

  const totals = rows.reduce(
    (a, r) => ({
      enrolled: a.enrolled + r.enrolled,
      collected: a.collected + r.collected,
      outstanding: a.outstanding + r.outstanding,
    }),
    { enrolled: 0, collected: 0, outstanding: 0 },
  );
  const schoolAverage = rows.length
    ? Math.round((rows.reduce((a, r) => a + r.average, 0) / rows.length) * 100) / 100
    : 0;

  return (
    <div>
      <PageHeader
        title="Reports"
        description={`${session} · ${term}`}
        actions={
          rows.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => downloadCSV("class-report.csv", toCSV(rows))}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Enrolment" value={totals.enrolled} tone="primary" icon={Users} />
        <StatCard label="School average" value={`${schoolAverage}%`} tone="success" icon={GraduationCap} />
        <StatCard label="Collected" value={naira(totals.collected)} icon={Wallet} />
        <StatCard label="Outstanding" value={naira(totals.outstanding)} tone="danger" />
      </div>

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Average</TableHead>
              <TableHead className="text-right">Pass rate</TableHead>
              <TableHead className="text-right">Attendance</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.classId}>
                <TableCell className="font-medium">{r.className}</TableCell>
                <TableCell className="text-right">{r.enrolled}</TableCell>
                <TableCell className="text-right">{r.average}%</TableCell>
                <TableCell className="text-right">{r.passRate}%</TableCell>
                <TableCell className="text-right">{r.attendanceRate}%</TableCell>
                <TableCell className="text-right">{naira(r.collected)}</TableCell>
                <TableCell className="text-right">{naira(r.outstanding)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

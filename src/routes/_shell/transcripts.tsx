import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common/page-header";
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
import { useOrgData } from "@/hooks/use-data";
import { fallbackSettings } from "@/hooks/use-data";
import { computeSubject, gradeFor } from "@/lib/result-engine";
import { printElement } from "@/lib/csv";

export const Route = createFileRoute("/_shell/transcripts")({
  head: () => ({
    meta: [
      { title: "Transcripts — Scholareer School OS" },
      { name: "description", content: "Cumulative academic transcripts across sessions and terms." },
      { property: "og:title", content: "Transcripts — Scholareer School OS" },
      { property: "og:description", content: "Print an official cumulative record for any student." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TranscriptsPage,
});

function TranscriptsPage() {
  const { data, orgId } = useOrgData();
  const [studentId, setStudentId] = useState("");
  const org = data?.organization;
  const students = data?.students ?? [];
  const subjects = data?.subjects ?? [];
  const settings = data?.settings ?? (orgId ? fallbackSettings(orgId) : null);

  const student = students.find((s) => s.id === studentId);

  const terms = useMemo(() => {
    if (!student || !settings) return [];
    const own = (data?.scores ?? []).filter((s) => s.studentId === student.id);
    const keys = Array.from(new Set(own.map((s) => `${s.session}|${s.term}`))).sort();
    return keys.map((key) => {
      const [session, term] = key.split("|");
      const rows = own
        .filter((s) => s.session === session && s.term === term)
        .map((s) => computeSubject(s, settings.grading));
      const total = rows.reduce((a, b) => a + b.total, 0);
      const average = rows.length ? Math.round((total / rows.length) * 100) / 100 : 0;
      return {
        session: session ?? "",
        term: term ?? "",
        rows,
        total,
        average,
        grade: gradeFor(average, settings.grading).grade,
      };
    });
  }, [student, settings, data?.scores]);

  const cumulative = terms.length
    ? Math.round((terms.reduce((a, b) => a + b.average, 0) / terms.length) * 100) / 100
    : 0;

  return (
    <div>
      <PageHeader
        title="Transcripts"
        description="Cumulative academic record"
        actions={
          student &&
          terms.length > 0 && (
            <Button size="sm" onClick={() => printElement("transcript-print", "Transcript")}>
              <Printer className="mr-1.5 h-4 w-4" /> Print transcript
            </Button>
          )
        }
      />

      <div className="surface-card mb-4 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Student</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.lastName} {s.firstName} — {s.admissionNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!student ? (
        <EmptyState title="Select a student" hint="Choose a student to build their transcript." />
      ) : terms.length === 0 ? (
        <EmptyState title="No academic history" hint="Scores must be entered before a transcript exists." />
      ) : (
        <div id="transcript-print" className="surface-card space-y-6 p-5">
          <header className="border-b pb-4 text-center">
            <h2 className="font-display text-lg font-extrabold">{org?.name}</h2>
            <p className="text-xs text-muted-foreground">{org?.address}</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-wide">Academic transcript</p>
            <p className="mt-1 text-sm">
              {student.lastName} {student.firstName} · {student.admissionNumber} · Cumulative average{" "}
              <strong>{cumulative}%</strong>
            </p>
          </header>

          {terms.map((t) => (
            <section key={`${t.session}-${t.term}`}>
              <h3 className="mb-2 text-sm font-semibold">
                {t.session} · {t.term} — average {t.average}% ({t.grade})
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                      <TableHead className="text-right">Exam</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.rows.map((r) => (
                      <TableRow key={r.subjectId}>
                        <TableCell className="font-medium">
                          {subjects.find((s) => s.id === r.subjectId)?.subjectName ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">{r.ca}</TableCell>
                        <TableCell className="text-right">{r.exam}</TableCell>
                        <TableCell className="text-right font-medium">{r.total}</TableCell>
                        <TableCell>{r.grade}</TableCell>
                        <TableCell>{r.remark}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}

          <p className="border-t pt-4 text-xs text-muted-foreground">
            Issued by {org?.name} · {new Date().toLocaleDateString("en-NG")} · This transcript is computer
            generated.
          </p>
        </div>
      )}
    </div>
  );
}

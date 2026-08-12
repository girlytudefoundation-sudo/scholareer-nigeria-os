import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, Send } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/lib/auth";
import { audit, scoreService } from "@/services";
import { gradeFor } from "@/lib/result-engine";
import type { ScoreRecord, ScoreStatus } from "@/db/types";

export const Route = createFileRoute("/_shell/results/entry")({
  head: () => ({
    meta: [
      { title: "Score Entry — Scholareer School OS" },
      { name: "description", content: "Enter CA and exam scores per class and subject." },
      { property: "og:title", content: "Score Entry — Scholareer School OS" },
      { property: "og:description", content: "Fast keyboard-friendly score entry grid." },
    ],
  }),
  component: ScoreEntryPage,
});

interface Row {
  studentId: string;
  name: string;
  ca1: number;
  ca2: number;
  ca3: number;
  exam: number;
  status: ScoreStatus;
}

function ScoreEntryPage() {
  const { data, orgId } = useOrgData();
  const { user } = useAuth();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const org = data?.organization;
  const classes = data?.classes ?? [];
  const subjects = useMemo(
    () =>
      (data?.subjects ?? []).filter(
        (s) => s.classIds.length === 0 || (classId ? s.classIds.includes(classId) : true),
      ),
    [data?.subjects, classId],
  );

  useEffect(() => {
    if (!classId && classes[0]) setClassId(classes[0].id);
  }, [classes, classId]);

  useEffect(() => {
    if (!subjects.some((s) => s.id === subjectId)) setSubjectId(subjects[0]?.id ?? "");
  }, [subjects, subjectId]);

  useEffect(() => {
    if (!org || !classId || !subjectId || !data) {
      setRows([]);
      return;
    }
    const students = data.students
      .filter((s) => s.classId === classId && s.status === "ACTIVE")
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
    setRows(
      students.map((s) => {
        const existing = data.scores.find(
          (x) =>
            x.studentId === s.id &&
            x.subjectId === subjectId &&
            x.session === org.currentSession &&
            x.term === org.currentTerm,
        );
        return {
          studentId: s.id,
          name: `${s.lastName}, ${s.firstName}`,
          ca1: existing?.ca1 ?? 0,
          ca2: existing?.ca2 ?? 0,
          ca3: existing?.ca3 ?? 0,
          exam: existing?.exam ?? 0,
          status: existing?.status ?? "DRAFT",
        };
      }),
    );
  }, [org, classId, subjectId, data]);

  const subject = subjects.find((s) => s.id === subjectId);
  const caMax = subject?.caMaximum ?? 30;
  const examMax = subject?.examMaximum ?? 70;

  function setCell(studentId: string, field: keyof Row, value: number) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, [field]: value } : r)),
    );
  }

  async function persist(status: ScoreStatus) {
    if (!orgId || !org || !classId || !subjectId) return;
    const records: ScoreRecord[] = rows.map((r) => ({
      id: `${r.studentId}|${subjectId}|${org.currentSession}|${org.currentTerm}`,
      organizationId: orgId,
      studentId: r.studentId,
      classId,
      subjectId,
      session: org.currentSession,
      term: org.currentTerm,
      ca1: r.ca1,
      ca2: r.ca2,
      ca3: r.ca3,
      exam: r.exam,
      status,
      enteredBy: user?.name ?? "Unknown",
      updatedAt: new Date().toISOString(),
    }));
    await scoreService.upsertMany(records);
    await audit(
      orgId,
      user?.name ?? "System",
      status === "SUBMITTED" ? "SUBMIT_SCORES" : "SAVE_SCORES",
      "Score",
      `${classId}|${subjectId}`,
      `${records.length} records`,
    );
    toast.success(status === "SUBMITTED" ? "Scores submitted for approval" : "Draft saved");
  }

  return (
    <div>
      <PageHeader
        title="Score Entry"
        description={
          org ? `${org.currentSession} · ${org.currentTerm}` : "Select a class and subject"
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => persist("DRAFT")}>
              <Save className="mr-1.5 h-4 w-4" /> Save draft
            </Button>
            <Button size="sm" onClick={() => persist("SUBMITTED")}>
              <Send className="mr-1.5 h-4 w-4" /> Submit
            </Button>
          </>
        }
      />

      <div className="surface-card mb-4 grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.subjectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing to score yet"
          hint="Pick a class and subject that has active students."
        />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-44">Student</TableHead>
                <TableHead>CA1</TableHead>
                <TableHead>CA2</TableHead>
                <TableHead>CA3</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const total = r.ca1 + r.ca2 + r.ca3 + r.exam;
                const band = gradeFor(total, data?.settings?.grading ?? []);
                return (
                  <TableRow key={r.studentId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    {(["ca1", "ca2", "ca3"] as const).map((f) => (
                      <TableCell key={f}>
                        <Input
                          className="h-8 w-16"
                          type="number"
                          min={0}
                          max={caMax}
                          value={r[f]}
                          onChange={(e) =>
                            setCell(
                              r.studentId,
                              f,
                              Math.max(0, Math.min(caMax, Number(e.target.value) || 0)),
                            )
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Input
                        className="h-8 w-16"
                        type="number"
                        min={0}
                        max={examMax}
                        value={r.exam}
                        onChange={(e) =>
                          setCell(
                            r.studentId,
                            "exam",
                            Math.max(0, Math.min(examMax, Number(e.target.value) || 0)),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="font-semibold">{total}</TableCell>
                    <TableCell>{band.grade}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "DRAFT" ? "outline" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

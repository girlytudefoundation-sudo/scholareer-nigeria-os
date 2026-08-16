import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Save } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/lib/auth";
import { attendanceService, audit } from "@/services";
import type { Attendance, AttendanceStatus } from "@/db/types";

export const Route = createFileRoute("/_shell/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — Scholareer School OS" },
      { name: "description", content: "Daily class attendance register for Nigerian schools." },
      { property: "og:title", content: "Attendance — Scholareer School OS" },
      { property: "og:description", content: "Mark, save and review daily student attendance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

const tone: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success/15 text-success",
  ABSENT: "bg-destructive/10 text-destructive",
  LATE: "bg-warning/20 text-warning-foreground",
  EXCUSED: "bg-muted text-muted-foreground",
};

function AttendancePage() {
  const { data, orgId } = useOrgData();
  const { user, has } = useAuth();
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});

  const classes = data?.classes ?? [];
  const canEdit = has("attendance.manage");

  useEffect(() => {
    if (!classId && classes[0]) setClassId(classes[0].id);
  }, [classes, classId]);

  const students = useMemo(
    () =>
      (data?.students ?? [])
        .filter((s) => s.classId === classId && s.status === "ACTIVE")
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [data?.students, classId],
  );

  const saved = useMemo(
    () => (data?.attendance ?? []).filter((a) => a.date === date && a.classId === classId),
    [data?.attendance, date, classId],
  );

  useEffect(() => {
    const next: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      next[s.id] = saved.find((a) => a.studentId === s.id)?.status ?? "PRESENT";
    }
    setMarks(next);
  }, [students, saved]);

  const counts = STATUSES.map(
    (st) => Object.values(marks).filter((m) => m === st).length,
  );

  async function save() {
    if (!orgId || !classId) return;
    const rows: Attendance[] = students.map((s) => ({
      id: `${s.id}|${date}`,
      organizationId: orgId,
      studentId: s.id,
      classId,
      date,
      status: marks[s.id] ?? "PRESENT",
    }));
    await attendanceService.upsertMany(rows);
    await audit(orgId, user?.name ?? "System", "SAVE", "Attendance", `${classId}|${date}`);
    toast.success(`Attendance saved for ${rows.length} students`);
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily register per class"
        actions={
          canEdit && students.length > 0 ? (
            <Button size="sm" onClick={save}>
              <Save className="mr-1.5 h-4 w-4" /> Save register
            </Button>
          ) : null
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
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Present" value={counts[0] ?? 0} tone="success" icon={CalendarCheck} />
        <StatCard label="Absent" value={counts[1] ?? 0} tone="danger" />
        <StatCard label="Late" value={counts[2] ?? 0} tone="warning" />
        <StatCard label="Excused" value={counts[3] ?? 0} />
      </div>

      {students.length === 0 ? (
        <EmptyState title="No students in this class" hint="Enrol students to take attendance." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission no.</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.admissionNumber}</TableCell>
                  <TableCell className="font-medium">
                    {s.lastName} {s.firstName}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {STATUSES.map((st) => {
                        const active = (marks[s.id] ?? "PRESENT") === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setMarks((m) => ({ ...m, [s.id]: st }))}
                            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                              active ? tone[st] : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {st.charAt(0) + st.slice(1).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

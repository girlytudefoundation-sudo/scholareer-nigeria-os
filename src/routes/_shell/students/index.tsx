import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, Pencil, Plus, Search, Trash2, Upload, Users } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { studentService, audit } from "@/services";
import { downloadCSV, parseCSV, toCSV } from "@/lib/csv";
import { StudentAvatar } from "@/components/students/student-avatar";
import { StudentFormDialog, type StudentDraft } from "@/components/students/student-form-dialog";
import type { Student, StudentStatus } from "@/db/types";

export const Route = createFileRoute("/_shell/students/")({
  head: () => ({
    meta: [
      { title: "Students — Scholareer School OS" },
      { name: "description", content: "Manage student records, admissions and enrolment." },
      { property: "og:title", content: "Students — Scholareer School OS" },
      { property: "og:description", content: "Search, filter, import and export student records." },
    ],
  }),
  component: StudentsPage,
});

const STATUSES: StudentStatus[] = ["ACTIVE", "GRADUATED", "TRANSFERRED", "WITHDRAWN"];

function StudentsPage() {
  const { data, orgId, loading } = useOrgData();
  const { user, has } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const classes = data?.classes ?? [];
  const students = data?.students ?? [];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => (classFilter === "all" ? true : s.classId === classFilter))
      .filter((s) => (statusFilter === "all" ? true : s.status === statusFilter))
      .filter((s) =>
        q
          ? `${s.firstName} ${s.middleName ?? ""} ${s.lastName} ${s.admissionNumber} ${s.parentName}`
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, query, classFilter, statusFilter]);

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "—";

  async function handleSubmit(draft: StudentDraft) {
    if (!orgId) return;
    if (editing) {
      await studentService.update(editing.id, draft);
      await audit(orgId, user?.name ?? "System", "UPDATE", "Student", editing.admissionNumber);
      toast.success("Student record updated");
      return;
    }
    const admissionNumber =
      draft.admissionNumber.trim() ||
      `ADM/${new Date().getFullYear()}/${String(students.length + 1).padStart(3, "0")}`;
    await studentService.create({ ...draft, admissionNumber, organizationId: orgId });
    await audit(orgId, user?.name ?? "System", "CREATE", "Student", admissionNumber);
    toast.success("Student admitted successfully");
  }

  function exportCSV() {
    const csv = toCSV(
      rows.map((s) => ({
        admissionNumber: s.admissionNumber,
        firstName: s.firstName,
        middleName: s.middleName ?? "",
        lastName: s.lastName,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        class: className(s.classId),
        arm: s.arm,
        house: s.house ?? "",
        admissionDate: s.admissionDate,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        status: s.status,
      })),
    );
    downloadCSV("scholareer-students.csv", csv);
    toast.success("Student list exported");
  }

  async function importCSV(file: File) {
    if (!orgId) return;
    const text = await file.text();
    const parsed = parseCSV(text);
    let count = 0;
    for (const row of parsed) {
      const r = row as Record<string, string | undefined>;
      const cls = classes.find((c) => c.name.toLowerCase() === (r["class"] ?? "").toLowerCase());
      if (!r["firstName"] || !r["lastName"] || !cls) continue;
      await studentService.create({
        admissionNumber:
          r["admissionNumber"] || `ADM/${new Date().getFullYear()}/${Date.now()}${count}`,
        firstName: r["firstName"],
        middleName: r["middleName"],
        lastName: r["lastName"],
        gender: (r["gender"] ?? "MALE").toUpperCase() === "FEMALE" ? "FEMALE" : "MALE",
        dateOfBirth: r["dateOfBirth"] ?? "",
        parentName: r["parentName"] ?? "",
        parentPhone: r["parentPhone"] ?? "",
        house: r["house"],
        classId: cls.id,
        arm: r["arm"] || cls.arm,
        admissionDate: r["admissionDate"] || new Date().toISOString().slice(0, 10),
        status: "ACTIVE",
        organizationId: orgId,
      } as Omit<Student, "id">);
      count += 1;
    }

    toast.success(`${count} student${count === 1 ? "" : "s"} imported`);
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description={`${rows.length} of ${students.length} records`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
            {has("students.manage") && (
              <>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" /> Import
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importCSV(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> New student
                </Button>
              </>
            )}
          </>
        }
      />

      <StudentFormDialog
        open={open}
        onOpenChange={setOpen}
        classes={classes}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <div className="surface-card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, admission number or parent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="No students found"
          hint="Adjust your filters or admit a new student to get started."
        />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Photo</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <StudentAvatar
                      passport={s.passport}
                      firstName={s.firstName}
                      lastName={s.lastName}
                      className="h-9 w-9 text-sm"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.admissionNumber}</TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: s.id }}
                      className="hover:text-primary hover:underline"
                    >
                      {s.lastName}, {s.firstName} {s.middleName ?? ""}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {className(s.classId)} {s.arm ? `· ${s.arm}` : ""}
                  </TableCell>
                  <TableCell>{s.gender === "MALE" ? "Male" : "Female"}</TableCell>
                  <TableCell className="max-w-40 truncate">{s.parentName}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "ACTIVE" ? "secondary" : "outline"}>
                      {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`View ${s.firstName}`}
                        onClick={() =>
                          navigate({ to: "/students/$studentId", params: { studentId: s.id } })
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {has("students.manage") && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${s.firstName}`}
                            onClick={() => {
                              setEditing(s);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${s.firstName}`}
                            onClick={async () => {
                              if (!confirm(`Remove ${s.firstName} ${s.lastName}?`)) return;
                              await studentService.remove(s.id);
                              if (orgId)
                                await audit(
                                  orgId,
                                  user?.name ?? "System",
                                  "DELETE",
                                  "Student",
                                  s.admissionNumber,
                                );
                              toast.success("Student removed");
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {students.length === 0 && !loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" /> Load the demo school from Settings to explore sample data.
        </div>
      )}
    </div>
  );
}

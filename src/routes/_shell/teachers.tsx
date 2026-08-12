import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { audit, teacherService } from "@/services";
import type { Teacher } from "@/db/types";

export const Route = createFileRoute("/_shell/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers — Scholareer School OS" },
      { name: "description", content: "Manage teaching staff, subjects and form classes." },
      { property: "og:title", content: "Teachers — Scholareer School OS" },
      { property: "og:description", content: "Staff directory with subject and class assignments." },
    ],
  }),
  component: TeachersPage,
});

const empty = {
  staffId: "",
  firstName: "",
  lastName: "",
  gender: "MALE",
  phone: "",
  email: "",
  qualification: "",
  formClassId: "",
};

function TeachersPage() {
  const { data, orgId, loading } = useOrgData();
  const { user, has } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [query, setQuery] = useState("");

  const classes = data?.classes ?? [];
  const teachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.teachers ?? []).filter((t) =>
      q ? `${t.firstName} ${t.lastName} ${t.staffId} ${t.email}`.toLowerCase().includes(q) : true,
    );
  }, [data?.teachers, query]);

  async function create() {
    if (!orgId) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    await teacherService.create({
      staffId: form.staffId.trim() || `STF/${String(teachers.length + 1).padStart(3, "0")}`,
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender as Teacher["gender"],
      phone: form.phone,
      email: form.email,
      qualification: form.qualification,
      subjectIds: [],
      classIds: form.formClassId ? [form.formClassId] : [],
      formClassId: form.formClassId || undefined,
      status: "ACTIVE",
      organizationId: orgId,
    });
    await audit(orgId, user?.name ?? "System", "CREATE", "Teacher", form.staffId);
    toast.success("Teacher added");
    setForm({ ...empty });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Teachers"
        description={`${teachers.length} staff members`}
        actions={
          has("teachers.manage") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add teacher
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add teaching staff</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <F label="First name">
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </F>
                  <F label="Last name">
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </F>
                  <F label="Staff ID">
                    <Input
                      placeholder="Auto"
                      value={form.staffId}
                      onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                    />
                  </F>
                  <F label="Gender">
                    <Select
                      value={form.gender}
                      onValueChange={(v) => setForm({ ...form, gender: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Phone">
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </F>
                  <F label="Email">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </F>
                  <F label="Qualification">
                    <Input
                      value={form.qualification}
                      onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    />
                  </F>
                  <F label="Form class">
                    <Select
                      value={form.formClassId}
                      onValueChange={(v) => setForm({ ...form, formClassId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </F>
                </div>
                <DialogFooter>
                  <Button onClick={create}>Save teacher</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="surface-card mb-4 p-4">
        <Input
          placeholder="Search staff by name, ID or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!loading && teachers.length === 0 ? (
        <EmptyState title="No teachers yet" hint="Add teaching staff to assign classes and subjects." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Form class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.staffId}</TableCell>
                  <TableCell className="font-medium">
                    {t.firstName} {t.lastName}
                  </TableCell>
                  <TableCell>{t.phone}</TableCell>
                  <TableCell>{t.qualification}</TableCell>
                  <TableCell>{classes.find((c) => c.id === t.formClassId)?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "ACTIVE" ? "secondary" : "outline"}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {has("teachers.manage") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${t.firstName}`}
                        onClick={async () => {
                          if (!confirm(`Remove ${t.firstName} ${t.lastName}?`)) return;
                          await teacherService.remove(t.id);
                          toast.success("Teacher removed");
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

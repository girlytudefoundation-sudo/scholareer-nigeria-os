import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { classService } from "@/services";
import type { ClassLevel } from "@/db/types";

export const Route = createFileRoute("/_shell/classes")({
  head: () => ({
    meta: [
      { title: "Classes — Scholareer School OS" },
      { name: "description", content: "Create and manage classes, arms and form teachers." },
      { property: "og:title", content: "Classes — Scholareer School OS" },
      { property: "og:description", content: "Creche to SSS class structure with arms." },
    ],
  }),
  component: ClassesPage,
});

const LEVELS: ClassLevel[] = ["CRECHE", "NURSERY", "PRIMARY", "JSS", "SSS"];

function ClassesPage() {
  const { data, orgId, loading } = useOrgData();
  const { has } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", level: "PRIMARY", arm: "A", formTeacherId: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const classes = [...(data?.classes ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const students = data?.students ?? [];
  const teachers = data?.teachers ?? [];

  async function save() {
    if (!orgId) return;
    if (!form.name.trim()) {
      toast.error("Class name is required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      level: form.level as ClassLevel,
      arm: form.arm.trim() || "A",
      formTeacherId: form.formTeacherId || undefined,
      organizationId: orgId,
    };
    if (editingId) {
      await classService.update(editingId, payload);
      toast.success("Class updated");
    } else {
      await classService.create(payload);
      toast.success("Class created");
    }
    setForm({ name: "", level: "PRIMARY", arm: "A", formTeacherId: "" });
    setEditingId(null);
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Classes"
        description={`${classes.length} classes configured`}
        actions={
          has("classes.manage") && (
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) {
                  setEditingId(null);
                  setForm({ name: "", level: "PRIMARY", arm: "A", formTeacherId: "" });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> New class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit class" : "Create a class"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Class name</Label>
                    <Input
                      placeholder="e.g. JSS 1A"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Level</Label>
                      <Select
                        value={form.level}
                        onValueChange={(v) => setForm({ ...form, level: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Arm</Label>
                      <Input
                        value={form.arm}
                        onChange={(e) => setForm({ ...form, arm: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Form teacher</Label>
                    <Select
                      value={form.formTeacherId}
                      onValueChange={(v) => setForm({ ...form, formTeacherId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.firstName} {t.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={save}>{editingId ? "Save changes" : "Create class"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {!loading && classes.length === 0 ? (
        <EmptyState title="No classes yet" hint="Create your first class to start admitting students." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Arm</TableHead>
                <TableHead>Form teacher</TableHead>
                <TableHead>Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.level}</TableCell>
                  <TableCell>{c.arm}</TableCell>
                  <TableCell>
                    {(() => {
                      const t = teachers.find((x) => x.id === c.formTeacherId);
                      return t ? `${t.firstName} ${t.lastName}` : "—";
                    })()}
                  </TableCell>
                  <TableCell>
                    {students.filter((s) => s.classId === c.id && s.status === "ACTIVE").length}
                  </TableCell>
                  <TableCell className="text-right">
                    {has("classes.manage") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => {
                          setEditingId(c.id);
                          setForm({
                            name: c.name,
                            level: c.level,
                            arm: c.arm,
                            formTeacherId: c.formTeacherId ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {has("classes.manage") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${c.name}`}
                        onClick={async () => {
                          if (students.some((s) => s.classId === c.id)) {
                            toast.error("Move students out of this class before deleting it.");
                            return;
                          }
                          await classService.remove(c.id);
                          toast.success("Class deleted");
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

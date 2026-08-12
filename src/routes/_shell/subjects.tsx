import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { subjectService } from "@/services";

export const Route = createFileRoute("/_shell/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — Scholareer School OS" },
      { name: "description", content: "Define subjects, scoring maximums and class offerings." },
      { property: "og:title", content: "Subjects — Scholareer School OS" },
      { property: "og:description", content: "Subject catalogue with CA and exam maximums." },
    ],
  }),
  component: SubjectsPage,
});

const empty = {
  subjectName: "",
  subjectCode: "",
  category: "Core",
  caMaximum: 30,
  examMaximum: 70,
  passMark: 40,
  classIds: [] as string[],
};

function SubjectsPage() {
  const { data, orgId, loading } = useOrgData();
  const { has } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });

  const subjects = data?.subjects ?? [];
  const classes = data?.classes ?? [];

  async function create() {
    if (!orgId) return;
    if (!form.subjectName.trim()) {
      toast.error("Subject name is required.");
      return;
    }
    await subjectService.create({
      subjectName: form.subjectName.trim(),
      subjectCode:
        form.subjectCode.trim() || form.subjectName.trim().slice(0, 3).toUpperCase(),
      category: form.category,
      maximumScore: form.caMaximum + form.examMaximum,
      caMaximum: form.caMaximum,
      examMaximum: form.examMaximum,
      passMark: form.passMark,
      gradingScheme: "default",
      classIds: form.classIds,
      organizationId: orgId,
    });
    toast.success("Subject created");
    setForm({ ...empty });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Subjects"
        description={`${subjects.length} subjects in the catalogue`}
        actions={
          has("subjects.manage") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> New subject
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create a subject</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Subject name</Label>
                    <Input
                      value={form.subjectName}
                      onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Subject code</Label>
                    <Input
                      value={form.subjectCode}
                      onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CA maximum</Label>
                    <Input
                      type="number"
                      value={form.caMaximum}
                      onChange={(e) => setForm({ ...form, caMaximum: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Exam maximum</Label>
                    <Input
                      type="number"
                      value={form.examMaximum}
                      onChange={(e) => setForm({ ...form, examMaximum: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs">Offered in classes</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {classes.map((c) => {
                        const checked = form.classIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                setForm({
                                  ...form,
                                  classIds: v
                                    ? [...form.classIds, c.id]
                                    : form.classIds.filter((x) => x !== c.id),
                                })
                              }
                            />
                            <span className="truncate">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={create}>Create subject</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {!loading && subjects.length === 0 ? (
        <EmptyState title="No subjects yet" hint="Add subjects so teachers can record scores." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>CA / Exam</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.subjectName}</TableCell>
                  <TableCell className="font-mono text-xs">{s.subjectCode}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {s.caMaximum} / {s.examMaximum}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">
                    {s.classIds.length
                      ? s.classIds
                          .map((id) => classes.find((c) => c.id === id)?.name)
                          .filter(Boolean)
                          .join(", ")
                      : "All classes"}
                  </TableCell>
                  <TableCell className="text-right">
                    {has("subjects.manage") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${s.subjectName}`}
                        onClick={async () => {
                          await subjectService.remove(s.id);
                          toast.success("Subject deleted");
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

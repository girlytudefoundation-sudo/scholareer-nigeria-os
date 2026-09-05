import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentAvatar } from "@/components/students/student-avatar";
import { ACCEPTED_PHOTO_TYPES, PHOTO_PLACEHOLDER_HINT, fileToPassportDataUrl } from "@/lib/image";
import type { SchoolClass, Student, StudentStatus } from "@/db/types";

export type StudentDraft = Omit<Student, "id" | "organizationId">;

const STATUSES: StudentStatus[] = ["ACTIVE", "GRADUATED", "TRANSFERRED", "WITHDRAWN"];

export const emptyStudentDraft = (): StudentDraft => ({
  admissionNumber: "",
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "MALE",
  dateOfBirth: "",
  passport: undefined,
  phone: "",
  email: "",
  address: "",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  classId: "",
  arm: "A",
  house: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  status: "ACTIVE",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: SchoolClass[];
  initial?: Student | null;
  onSubmit: (draft: StudentDraft) => Promise<void> | void;
}

export function StudentFormDialog({ open, onOpenChange, classes, initial, onSubmit }: Props) {
  const [form, setForm] = useState<StudentDraft>(emptyStudentDraft());
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const { id: _id, organizationId: _org, ...rest } = initial;
      setForm({ ...emptyStudentDraft(), ...rest });
    } else {
      setForm(emptyStudentDraft());
    }
  }, [open, initial]);

  const set = <K extends keyof StudentDraft>(key: K, value: StudentDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function pickPhoto(file: File) {
    try {
      const dataUrl = await fileToPassportDataUrl(file);
      set("passport", dataUrl);
      toast.success("Photograph attached — save the student to store it");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that image.");
    }
  }

  async function submit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.classId) {
      toast.error("First name, last name and class are required.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit student" : "Admit a student"}</DialogTitle>
          <DialogDescription>
            Records are stored offline on this device and sync-ready.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <StudentAvatar
              passport={form.passport}
              firstName={form.firstName || "N"}
              lastName={form.lastName || "A"}
              className="h-28 w-24 text-3xl"
            />
            <input
              ref={fileRef}
              type="file"
              hidden
              accept={ACCEPTED_PHOTO_TYPES.join(",")}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickPhoto(f);
                e.target.value = "";
              }}
            />
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                {form.passport ? (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Change
                  </>
                ) : (
                  <>
                    <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Upload
                  </>
                )}
              </Button>
              {form.passport && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove photograph"
                  onClick={() => set("passport", undefined)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <p className="max-w-32 text-center text-[11px] leading-tight text-muted-foreground">
              {PHOTO_PLACEHOLDER_HINT}
            </p>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label="Middle name">
              <Input value={form.middleName ?? ""} onChange={(e) => set("middleName", e.target.value)} />
            </Field>
            <Field label="Admission number">
              <Input
                placeholder="Auto-generated"
                value={form.admissionNumber}
                onChange={(e) => set("admissionNumber", e.target.value)}
              />
            </Field>
            <Field label="Result checker password">
              <Input
                placeholder={DEFAULT_STUDENT_PASSWORD}
                value={form.portalPassword ?? ""}
                onChange={(e) => set("portalPassword", e.target.value)}
              />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onValueChange={(v) => set("gender", v as Student["gender"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </Field>
            <Field label="Class">
              <Select
                value={form.classId}
                onValueChange={(v) => {
                  const c = classes.find((x) => x.id === v);
                  setForm((f) => ({ ...f, classId: v, arm: c?.arm ?? f.arm }));
                }}
              >
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
            </Field>
            <Field label="Class arm">
              <Input value={form.arm} onChange={(e) => set("arm", e.target.value)} />
            </Field>
            <Field label="Admission date">
              <Input
                type="date"
                value={form.admissionDate}
                onChange={(e) => set("admissionDate", e.target.value)}
              />
            </Field>
            <Field label="House">
              <Input
                placeholder="e.g. Unity House"
                value={form.house ?? ""}
                onChange={(e) => set("house", e.target.value)}
              />
            </Field>
            <Field label="Parent / guardian name">
              <Input value={form.parentName} onChange={(e) => set("parentName", e.target.value)} />
            </Field>
            <Field label="Parent / guardian phone">
              <Input value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
            </Field>
            <Field label="Parent email">
              <Input
                type="email"
                value={form.parentEmail ?? ""}
                onChange={(e) => set("parentEmail", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v as StudentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Home address">
                <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {initial ? "Save changes" : "Save student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

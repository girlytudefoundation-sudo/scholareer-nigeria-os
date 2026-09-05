import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileDown, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgData } from "@/hooks/use-data";
import { useAuth } from "@/lib/auth";
import { audit, resultService } from "@/services";
import { computeClassResults, ordinal } from "@/lib/result-engine";
import {
  AFFECTIVE_TRAITS,
  DEFAULT_ASSESSMENT,
  DEFAULT_RATING_SCALE,
  PSYCHOMOTOR_TRAITS,
} from "@/lib/constants";
import { ReportSheet, printReport } from "@/components/results/report-sheet";
import type { ResultMeta } from "@/db/types";

export const Route = createFileRoute("/_shell/results/$studentId/report")({
  head: () => ({
    meta: [
      { title: "Report Card — Scholareer School OS" },
      { name: "description", content: "Printable A4 student performance report with grades, position and conduct." },
      { property: "og:title", content: "Report Card — Scholareer School OS" },
      { property: "og:description", content: "A4-ready student performance report sheet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportCardPage,
});


function ReportCardPage() {
  const { studentId } = Route.useParams();
  const { data, orgId } = useOrgData();
  const { user, has } = useAuth();
  const canEdit = has("results.approve") || has("scores.enter");

  const [teacherComment, setTeacherComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");
  const [affective, setAffective] = useState<Record<string, number>>({});
  const [psychomotor, setPsychomotor] = useState<Record<string, number>>({});

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

    // Attendance is derived from real register entries for this student's class.
    const classAttendance = data.attendance.filter((a) => a.classId === student.classId);
    const daysOpened = new Set(classAttendance.map((a) => a.date)).size;
    const own = classAttendance.filter((a) => a.studentId === student.id);
    const present = own.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const absent = Math.max(daysOpened - present, 0);

    return {
      org,
      student,
      cls: data.classes.find((c) => c.id === student.classId),
      agg: aggs.find((a) => a.studentId === student.id),
      subjects: data.subjects,
      meta,
      assessment: data.settings?.assessment ?? DEFAULT_ASSESSMENT,
      ratingScale: data.settings?.ratingScale?.length
        ? data.settings.ratingScale
        : DEFAULT_RATING_SCALE,
      attendance: { daysOpened, present, absent },
    };
  }, [data, studentId]);

  useEffect(() => {
    if (!view) return;
    setTeacherComment(view.meta?.teacherComment ?? "");
    setPrincipalComment(view.meta?.principalComment ?? "");
    setAffective(view.meta?.affective ?? {});
    setPsychomotor(view.meta?.psychomotor ?? {});
  }, [view?.meta]);

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

  const { org, student: s, cls, agg, assessment, attendance, ratingScale } = view;

  async function saveDetails() {
    if (!orgId || !view) return;
    const row: ResultMeta = {
      id: resultService.key(view.student.id, view.org.currentSession, view.org.currentTerm),
      organizationId: orgId,
      studentId: view.student.id,
      classId: view.student.classId,
      session: view.org.currentSession,
      term: view.org.currentTerm,
      status: view.meta?.status ?? "DRAFT",
      accessBlocked: view.meta?.accessBlocked ?? false,
      blockReason: view.meta?.blockReason,
      manualOverride: view.meta?.manualOverride ?? null,
      teacherComment,
      principalComment,
      traits: view.meta?.traits ?? {},
      affective,
      psychomotor,
      updatedAt: new Date().toISOString(),
    };
    await resultService.upsert(row);
    await audit(orgId, user?.name ?? "System", "UPDATE", "Result", view.student.id, "Report details");
    toast.success("Report details saved");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/results">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to results
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={printReport}>
            <Printer className="mr-1.5 h-4 w-4" /> Print report
          </Button>
          <Button
            size="sm"
            onClick={() => {
              toast.info('Choose "Save as PDF" as the destination in the print dialog.');
              printReport();
            }}
          >
            <FileDown className="mr-1.5 h-4 w-4" /> Save as PDF
          </Button>
        </div>
      </div>

      {canEdit && (
        <div className="surface-card mb-5 p-4 print:hidden">
          <p className="text-sm font-semibold">Result details</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Conduct ratings and comments are stored against this student for{" "}
            {org.currentTerm}, {org.currentSession}.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <TraitEditor
              title="Affective domain"
              traits={AFFECTIVE_TRAITS}
              values={affective}
              scale={ratingScale}
              onChange={(t, v) => setAffective((m) => ({ ...m, [t]: v }))}
            />
            <TraitEditor
              title="Psychomotor domain"
              traits={PSYCHOMOTOR_TRAITS}
              values={psychomotor}
              scale={ratingScale}
              onChange={(t, v) => setPsychomotor((m) => ({ ...m, [t]: v }))}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Form teacher's comment</Label>
              <Textarea
                rows={3}
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Principal's comment</Label>
              <Textarea
                rows={3}
                value={principalComment}
                onChange={(e) => setPrincipalComment(e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-3" size="sm" onClick={saveDetails}>
            <Save className="mr-1.5 h-4 w-4" /> Save result details
          </Button>
        </div>
      )}

      <ReportSheet
        org={org}
        student={s}
        cls={cls}
        agg={agg}
        subjects={view.subjects}
        assessment={assessment}
        attendance={attendance}
        affective={affective}
        psychomotor={psychomotor}
        teacherComment={teacherComment}
        principalComment={principalComment}
        session={org.currentSession}
        term={org.currentTerm}
      />
    </div>
  );
}


function TraitEditor({
  title,
  traits,
  values,
  scale,
  onChange,
}: {
  title: string;
  traits: string[];
  values: Record<string, number>;
  scale: { value: number; label: string }[];
  onChange: (trait: string, value: number) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {traits.map((t) => (
          <div key={t} className="flex items-center justify-between gap-2">
            <span className="truncate text-xs">{t}</span>
            <Select
              value={values[t] ? String(values[t]) : ""}
              onValueChange={(v) => onChange(t, Number(v))}
            >
              <SelectTrigger className="h-8 w-28">
                <SelectValue placeholder="Rate" />
              </SelectTrigger>
              <SelectContent>
                {scale.map((r) => (
                  <SelectItem key={r.value} value={String(r.value)}>
                    {r.value} · {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

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
import { StudentAvatar } from "@/components/students/student-avatar";
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

function printReport() {
  document.body.classList.add("printing-report");
  const cleanup = () => document.body.classList.remove("printing-report");
  window.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 1500);
  }, 60);
}

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
  const subjectRows = (agg?.subjects ?? []).map((sub) => ({
    ...sub,
    name: view.subjects.find((x) => x.id === sub.subjectId)?.subjectName ?? "—",
  }));
  const attendancePct = attendance.daysOpened
    ? Math.round((attendance.present / attendance.daysOpened) * 100)
    : 0;

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

  const ratingOf = (map: Record<string, number>, trait: string) => map[trait] ?? 0;

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

      <div className="rc-scroll">
        <div id="report-card" className="rc-sheet print-sheet">
          {/* Header */}
          <table>
            <tbody>
              <tr>
                <td style={{ width: "28mm" }} className="rc-center">
                  {org.logo ? (
                    <img src={org.logo} alt={`${org.name} logo`} className="rc-logo" />
                  ) : (
                    <span style={{ fontSize: "7.5pt", fontWeight: 700 }}>LOGO</span>
                  )}
                </td>
                <td className="rc-center">
                  <p className="rc-head-name">{org.name}</p>
                  {org.motto && <p className="rc-motto">{org.motto}</p>}
                  <p className="rc-meta">
                    {org.address} | {org.phone} | {org.email}
                  </p>
                  <p className="rc-title">Student Performance Report</p>
                </td>
                <td style={{ width: "30mm" }} className="rc-center">
                  <StudentAvatarPrint
                    passport={s.passport}
                    firstName={s.firstName}
                    lastName={s.lastName}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Student information */}
          <table style={{ marginTop: "3mm" }}>
            <tbody>
              <tr>
                <td className="rc-label">Student</td>
                <td>{`${s.firstName} ${s.middleName ?? ""} ${s.lastName}`.replace(/\s+/g, " ")}</td>
                <td className="rc-label">Admission No.</td>
                <td>{s.admissionNumber}</td>
              </tr>
              <tr>
                <td className="rc-label">Class / Arm</td>
                <td>
                  {cls?.name ?? "—"} / {s.arm || "—"}
                </td>
                <td className="rc-label">Gender</td>
                <td>{s.gender === "MALE" ? "Male" : "Female"}</td>
              </tr>
              <tr>
                <td className="rc-label">Session</td>
                <td>{org.currentSession}</td>
                <td className="rc-label">Term</td>
                <td>{org.currentTerm}</td>
              </tr>
              <tr>
                <td className="rc-label">Date of birth</td>
                <td>{s.dateOfBirth || "—"}</td>
                <td className="rc-label">House</td>
                <td>{s.house || "—"}</td>
              </tr>
              <tr>
                <td className="rc-label">Resumption</td>
                <td>{org.resumptionDate || "—"}</td>
                <td className="rc-label">Parent / Guardian</td>
                <td>{s.parentName || "—"}</td>
              </tr>
            </tbody>
          </table>

          {/* Academic performance */}
          <p className="rc-section-title">Academic Performance</p>
          <table>
            <thead>
              <tr>
                <th style={{ width: "8mm" }}>S/N</th>
                <th style={{ textAlign: "left" }}>Subject</th>
                <th style={{ width: "14mm" }}>CA 1 ({assessment.ca1Max})</th>
                <th style={{ width: "14mm" }}>CA 2 ({assessment.ca2Max})</th>
                <th style={{ width: "18mm" }}>Exam ({assessment.examMax})</th>
                <th style={{ width: "14mm" }}>Total</th>
                <th style={{ width: "13mm" }}>Grade</th>
                <th style={{ width: "26mm" }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {subjectRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rc-center">
                    No scores have been recorded for this term.
                  </td>
                </tr>
              ) : (
                subjectRows.map((sub, i) => (
                  <tr key={sub.subjectId}>
                    <td className="rc-center">{i + 1}</td>
                    <td>{sub.name}</td>
                    <td className="rc-center">{sub.ca1}</td>
                    <td className="rc-center">{sub.ca2}</td>
                    <td className="rc-center">{sub.exam}</td>
                    <td className="rc-center" style={{ fontWeight: 700 }}>
                      {sub.total}
                    </td>
                    <td className="rc-center">{sub.grade}</td>
                    <td>{sub.remark}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Summary */}
          <table style={{ marginTop: "3mm" }}>
            <thead>
              <tr>
                <th>Total score</th>
                <th>Average</th>
                <th>Position</th>
                <th>Students in class</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rc-center">{agg?.total ?? 0}</td>
                <td className="rc-center">{agg?.average ?? 0}%</td>
                <td className="rc-center">{ordinal(agg?.position ?? 0)}</td>
                <td className="rc-center">{agg?.outOf ?? 0}</td>
                <td className="rc-center">
                  {attendance.present} / {attendance.daysOpened}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Domains */}
          <div className="rc-grid2" style={{ marginTop: "3mm" }}>
            <div>
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Affective domain</th>
                    <th style={{ width: "16mm" }}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {AFFECTIVE_TRAITS.map((t) => (
                    <tr key={t}>
                      <td>{t}</td>
                      <td className="rc-center">{ratingOf(affective, t) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Psychomotor domain</th>
                    <th style={{ width: "16mm" }}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {PSYCHOMOTOR_TRAITS.map((t) => (
                    <tr key={t}>
                      <td>{t}</td>
                      <td className="rc-center">{ratingOf(psychomotor, t) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance summary */}
          <table style={{ marginTop: "3mm" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Attendance summary</th>
                <th>Days opened</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {org.currentTerm}, {org.currentSession}
                </td>
                <td className="rc-center">{attendance.daysOpened}</td>
                <td className="rc-center">{attendance.present}</td>
                <td className="rc-center">{attendance.absent}</td>
                <td className="rc-center">{attendancePct}%</td>
              </tr>
            </tbody>
          </table>

          {/* Comments */}
          <table style={{ marginTop: "3mm" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", width: "50%" }}>Form teacher's comment</th>
                <th style={{ textAlign: "left" }}>Principal's comment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rc-comment-box" style={{ verticalAlign: "top" }}>
                  {teacherComment || "—"}
                </td>
                <td className="rc-comment-box" style={{ verticalAlign: "top" }}>
                  {principalComment || "—"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <table style={{ marginTop: "3mm" }}>
            <thead>
              <tr>
                <th>Form teacher</th>
                <th>Principal</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rc-sign-box rc-center" style={{ verticalAlign: "bottom" }}>
                  Signature: ____________________
                </td>
                <td className="rc-sign-box rc-center" style={{ verticalAlign: "bottom" }}>
                  {org.principalName ? `${org.principalName} — ` : ""}____________________
                </td>
                <td className="rc-sign-box rc-center" style={{ verticalAlign: "bottom" }}>
                  ____________________
                </td>
              </tr>
            </tbody>
          </table>

          <p className="rc-footer">
            <strong>Scholareer</strong> | Where Scholarship Meets Career | Official Academic Report
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentAvatarPrint({
  passport,
  firstName,
  lastName,
}: {
  passport?: string | undefined;
  firstName: string;
  lastName: string;
}) {
  if (passport) {
    return (
      <img
        src={passport}
        alt={`${firstName} ${lastName} passport photograph`}
        className="rc-photo"
      />
    );
  }
  return (
    <div className="rc-photo" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <StudentAvatar
        firstName={firstName}
        lastName={lastName}
        className="h-full w-full rounded-none border-0 text-2xl"
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

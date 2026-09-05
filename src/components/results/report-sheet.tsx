import { StudentAvatar } from "@/components/students/student-avatar";
import { AFFECTIVE_TRAITS, PSYCHOMOTOR_TRAITS } from "@/lib/constants";
import { ordinal, type StudentAggregate } from "@/lib/result-engine";
import type { AssessmentConfig, Organization, SchoolClass, Student, Subject } from "@/db/types";

/** Triggers the browser print dialog with the A4 report stylesheet applied. */
export function printReport() {
  document.body.classList.add("printing-report");
  const cleanup = () => document.body.classList.remove("printing-report");
  window.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 1500);
  }, 60);
}

export function StudentAvatarPrint({
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
    <div
      className="rc-photo"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <StudentAvatar
        firstName={firstName}
        lastName={lastName}
        className="h-full w-full rounded-none border-0 text-2xl"
      />
    </div>
  );
}

export interface ReportSheetProps {
  org: Organization;
  student: Student;
  cls?: SchoolClass | undefined;
  agg?: StudentAggregate | undefined;
  subjects: Subject[];
  assessment: AssessmentConfig;
  attendance: { daysOpened: number; present: number; absent: number };
  affective: Record<string, number>;
  psychomotor: Record<string, number>;
  teacherComment: string;
  principalComment: string;
  session: string;
  term: string;
}

/** The professional A4 report sheet. Shared by the staff report page and the student portal. */
export function ReportSheet({
  org,
  student: s,
  cls,
  agg,
  subjects,
  assessment,
  attendance,
  affective,
  psychomotor,
  teacherComment,
  principalComment,
  session,
  term,
}: ReportSheetProps) {
  const subjectRows = (agg?.subjects ?? []).map((sub) => ({
    ...sub,
    name: subjects.find((x) => x.id === sub.subjectId)?.subjectName ?? "—",
  }));
  const attendancePct = attendance.daysOpened
    ? Math.round((attendance.present / attendance.daysOpened) * 100)
    : 0;
  const ratingOf = (map: Record<string, number>, trait: string) => map[trait] ?? 0;

  return (
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
              <td className="rc-label">Registration No.</td>
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
              <td>{session}</td>
              <td className="rc-label">Term</td>
              <td>{term}</td>
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
                {term}, {session}
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
  );
}

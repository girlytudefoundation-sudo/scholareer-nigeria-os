import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Lock, Printer, ShieldOff, Unlock } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { audit, balanceFor, notify, resultService } from "@/services";
import { computeClassResults, ordinal } from "@/lib/result-engine";
import { naira } from "@/lib/constants";
import type { ResultMeta } from "@/db/types";

export const Route = createFileRoute("/_shell/results/")({
  head: () => ({
    meta: [
      { title: "Results & RACE — Scholareer School OS" },
      {
        name: "description",
        content: "Approve, publish and control access to student results with RACE.",
      },
      { property: "og:title", content: "Results & RACE — Scholareer School OS" },
      {
        property: "og:description",
        content: "Automatic computation, ranking and fee-based result access control.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { data, orgId } = useOrgData();
  const { user, has } = useAuth();
  const [classId, setClassId] = useState("");

  const org = data?.organization;
  const classes = data?.classes ?? [];

  useEffect(() => {
    if (!classId && classes[0]) setClassId(classes[0].id);
  }, [classes, classId]);

  const rows = useMemo(() => {
    if (!data || !org || !classId) return [];
    const students = data.students.filter((s) => s.classId === classId && s.status === "ACTIVE");
    const scores = data.scores.filter(
      (s) =>
        s.classId === classId && s.session === org.currentSession && s.term === org.currentTerm,
    );
    const aggs = computeClassResults(
      scores,
      students.map((s) => s.id),
      {
        grading: data.settings?.grading ?? [],
        positionMethod: data.settings?.positionMethod ?? "COMPETITION",
      },
    );
    return students
      .map((s) => {
        const agg = aggs.find((a) => a.studentId === s.id)!;
        const meta = data.results.find(
          (r) =>
            r.studentId === s.id &&
            r.session === org.currentSession &&
            r.term === org.currentTerm,
        );
        const bal = balanceFor(
          s.id,
          s.classId,
          data.fees,
          data.payments,
          org.currentSession,
          org.currentTerm,
        );
        const owing = bal.balance > 0;
        const autoBlocked = Boolean(data.settings?.blockResultOnDebt) && owing;
        const blocked =
          meta?.manualOverride === "BLOCK"
            ? true
            : meta?.manualOverride === "ALLOW"
              ? false
              : autoBlocked;
        return { student: s, agg, meta, bal, blocked, owing };
      })
      .sort((a, b) => (a.agg.position || 999) - (b.agg.position || 999));
  }, [data, org, classId]);

  async function setStatusForClass(status: ResultMeta["status"]) {
    if (!orgId || !org) return;
    const records: ResultMeta[] = rows.map((r) => ({
      id: `${r.student.id}|${org.currentSession}|${org.currentTerm}`,
      organizationId: orgId,
      studentId: r.student.id,
      classId,
      session: org.currentSession,
      term: org.currentTerm,
      status,
      accessBlocked: r.blocked,
      manualOverride: r.meta?.manualOverride ?? null,
      teacherComment: r.meta?.teacherComment,
      principalComment: r.meta?.principalComment,
      traits: r.meta?.traits ?? {},
      updatedAt: new Date().toISOString(),
    }));
    await resultService.upsertMany(records);
    await audit(orgId, user?.name ?? "System", status, "Result", classId, `${rows.length} results`);
    if (status === "PUBLISHED") {
      await notify(
        orgId,
        "Results published",
        `${classes.find((c) => c.id === classId)?.name} results are now available to parents.`,
        "success",
      );
    }
    toast.success(`Results ${status.toLowerCase()}`);
  }

  async function toggleOverride(studentId: string, override: "ALLOW" | "BLOCK" | null) {
    if (!orgId || !org) return;
    const existing = rows.find((r) => r.student.id === studentId);
    await resultService.upsert({
      id: `${studentId}|${org.currentSession}|${org.currentTerm}`,
      organizationId: orgId,
      studentId,
      classId,
      session: org.currentSession,
      term: org.currentTerm,
      status: existing?.meta?.status ?? "APPROVED",
      accessBlocked: override === "BLOCK",
      manualOverride: override,
      teacherComment: existing?.meta?.teacherComment,
      principalComment: existing?.meta?.principalComment,
      traits: existing?.meta?.traits ?? {},
      updatedAt: new Date().toISOString(),
    });
    toast.success(
      override === "ALLOW"
        ? "Result access granted"
        : override === "BLOCK"
          ? "Result access blocked"
          : "Access reset to automatic rule",
    );
  }

  return (
    <div>
      <PageHeader
        title="Results & Access Control"
        description={
          org
            ? `${org.currentSession} · ${org.currentTerm} · RACE ${
                data?.settings?.blockResultOnDebt ? "enforcing fee clearance" : "open access"
              }`
            : ""
        }
        actions={
          has("results.approve") && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStatusForClass("APPROVED")}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve class
              </Button>
              <Button size="sm" onClick={() => setStatusForClass("PUBLISHED")}>
                Publish class
              </Button>
            </>
          )
        }
      />

      <div className="surface-card mb-4 max-w-sm p-4">
        <Label className="text-xs">Class</Label>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="mt-1.5">
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

      {rows.length === 0 ? (
        <EmptyState title="No results to show" hint="Enter and submit scores for this class first." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="text-right">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.student.id}>
                  <TableCell className="font-medium">
                    {r.student.lastName}, {r.student.firstName}
                  </TableCell>
                  <TableCell>{r.agg.subjects.length}</TableCell>
                  <TableCell>{r.agg.total}</TableCell>
                  <TableCell>{r.agg.average}%</TableCell>
                  <TableCell>{ordinal(r.agg.position)}</TableCell>
                  <TableCell className={r.owing ? "text-destructive" : ""}>
                    {naira(r.bal.balance)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.meta?.status === "PUBLISHED" ? "secondary" : "outline"}>
                      {r.meta?.status ?? "DRAFT"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.blocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                        <ShieldOff className="h-3.5 w-3.5" /> Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <Unlock className="h-3.5 w-3.5" /> Open
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {has("results.access") &&
                        (r.blocked ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Grant access"
                            onClick={() => toggleOverride(r.student.id, "ALLOW")}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Block access"
                            onClick={() => toggleOverride(r.student.id, "BLOCK")}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        ))}
                      <Button asChild size="icon" variant="ghost" aria-label="Open report card">
                        <Link
                          to="/results/$studentId/report"
                          params={{ studentId: r.student.id }}
                        >
                          <Printer className="h-4 w-4" />
                        </Link>
                      </Button>
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

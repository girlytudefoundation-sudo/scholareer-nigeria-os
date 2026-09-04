import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  CircleDollarSign,
  ShieldAlert,
  ShieldOff,
  Users,
  UserSquare2,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { useOrgData } from "@/hooks/use-data";
import { balanceFor } from "@/services";
import { naira } from "@/lib/constants";
import { computeClassResults } from "@/lib/result-engine";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Scholareer School OS" },
      { name: "description", content: "Live school statistics for students, fees and results." },
      { property: "og:title", content: "Dashboard — Scholareer School OS" },
      { property: "og:description", content: "Live school statistics powered by your own data." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, loading } = useOrgData();
  const { user } = useAuth();
  const showFinance = can(user?.role, "finance.view");

  const stats = useMemo(() => {
    if (!data?.organization) return null;
    const org = data.organization;
    const session = org.currentSession;
    const term = org.currentTerm;
    const active = data.students.filter((s) => s.status === "ACTIVE");

    const balances = active.map((s) =>
      balanceFor(s.id, s.classId, data.fees, data.payments, session, term),
    );
    const paid = balances.filter((b) => b.status === "PAID").length;
    const partial = balances.filter((b) => b.status === "PARTIAL").length;
    const owing = balances.filter((b) => b.status === "OWING").length;
    const collected = data.payments
      .filter((p) => p.session === session && p.term === term)
      .reduce((a, b) => a + b.amount, 0);
    const expected = balances.reduce((a, b) => a + b.totalFees, 0);

    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = data.attendance.filter((a) => a.date === today);
    const present = todayRecords.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE",
    ).length;

    const termResults = data.results.filter((r) => r.session === session && r.term === term);
    const pending = termResults.filter((r) => r.status === "SUBMITTED").length;
    const blocked = termResults.filter((r) => r.accessBlocked).length;
    const pendingSubmission = new Set(
      data.scores
        .filter((s) => s.session === session && s.term === term && s.status === "DRAFT")
        .map((s) => s.enteredBy ?? "Unassigned"),
    ).size;

    const byClass = data.classes.map((c) => ({
      name: c.name,
      students: active.filter((s) => s.classId === c.id).length,
    }));

    const collectionByMonth = (() => {
      const map = new Map<string, number>();
      data.payments.forEach((p) => {
        const k = p.date.slice(0, 7);
        map.set(k, (map.get(k) ?? 0) + p.amount);
      });
      return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, amount]) => ({ month, amount }));
    })();

    const settings = data.settings;
    const performance = data.classes.map((c) => {
      const ids = active.filter((s) => s.classId === c.id).map((s) => s.id);
      const scores = data.scores.filter(
        (s) => s.classId === c.id && s.session === session && s.term === term,
      );
      const aggs = computeClassResults(scores, ids, {
        grading: settings?.grading ?? [],
        positionMethod: settings?.positionMethod ?? "COMPETITION",
      });
      const withData = aggs.filter((a) => a.subjects.length);
      const avg = withData.length
        ? withData.reduce((a, b) => a + b.average, 0) / withData.length
        : 0;
      return { name: c.name, average: Math.round(avg * 10) / 10 };
    });

    return {
      org,
      totalStudents: active.length,
      totalTeachers: data.teachers.filter((t) => t.status === "ACTIVE").length,
      totalClasses: data.classes.length,
      paid,
      partial,
      owing,
      collected,
      expected,
      present,
      attendanceCount: todayRecords.length,
      pending,
      blocked,
      pendingSubmission,
      byClass,
      collectionByMonth,
      performance,
    };
  }, [data]);

  if (loading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const pieData = [
    { name: "Fully paid", value: stats.paid, color: "var(--color-success)" },
    { name: "Partial", value: stats.partial, color: "var(--color-warning)" },
    { name: "Owing", value: stats.owing, color: "var(--color-destructive)" },
  ];

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ")[0] ?? "there"}`}
        description={`${stats.org.name} · ${stats.org.currentSession} · ${stats.org.currentTerm}`}
      />

      <section className="surface-card mb-6 p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
          School Briefing
        </h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>• {stats.totalStudents} students enrolled</li>
          <li>• {stats.present} present today</li>
          <li>• {naira(stats.collected)} collected this term</li>
          <li>• {stats.owing + stats.partial} students have outstanding balances</li>
          <li>• {stats.pendingSubmission} teachers have pending score submissions</li>
          <li>• {stats.pending} results are awaiting approval</li>
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Students" value={stats.totalStudents} icon={Users} tone="primary" />
        <StatCard label="Total Teachers" value={stats.totalTeachers} icon={UserSquare2} />
        <StatCard label="Total Classes" value={stats.totalClasses} icon={BookOpen} />
        <StatCard
          label="Attendance Today"
          value={`${stats.present}/${stats.attendanceCount || stats.totalStudents}`}
          icon={CalendarCheck}
          tone="success"
        />
        <StatCard label="Students Fully Paid" value={stats.paid} icon={BadgeCheck} tone="success" />
        <StatCard label="Partially Paid" value={stats.partial} icon={Wallet} tone="warning" />
        <StatCard label="Students Owing" value={stats.owing} icon={ShieldAlert} tone="danger" />
        <StatCard
          label="Fees Collected"
          value={naira(stats.collected)}
          hint={`of ${naira(stats.expected)} expected`}
          icon={CircleDollarSign}
          tone="primary"
        />
        <StatCard
          label="Results Pending Approval"
          value={stats.pending}
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard label="Results Blocked" value={stats.blocked} icon={ShieldOff} tone="danger" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Fee collection trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.collectionByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(v) => naira(Number(v))} />
              <Line type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Student population by class">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byClass}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="students" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Academic performance (class average)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="average" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-4">
      <h3 className="font-display mb-3 text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

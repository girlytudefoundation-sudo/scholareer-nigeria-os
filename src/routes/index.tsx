import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogIn,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scholareer — The School Operating System" },
      {
        name: "description",
        content:
          "Scholareer is a Nigerian multi-school operating system for students, results, finance and administration. Where Scholarship Meets Career.",
      },
      { property: "og:title", content: "Scholareer — The School Operating System" },
      {
        property: "og:description",
        content: "Manage students, academics, results and finance in one offline-first platform.",
      },
    ],
  }),
  component: HomePage,
});

const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "superadmin@scholareer.ng", pass: "password" },
  { role: "Principal", email: "principal@allsaints.ng", pass: "password" },
  { role: "Bursar", email: "bursar@allsaints.ng", pass: "password" },
  { role: "Teacher", email: "teacher@allsaints.ng", pass: "password" },
];

function HomePage() {
  const { user, loading, seeded, loadDemo } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="brand-gradient grid h-9 w-9 place-items-center rounded-xl">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-sm font-extrabold tracking-tight">SCHOLAREER</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Where Scholarship Meets Career
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/login">
            <LogIn className="mr-1.5 h-4 w-4" /> Sign in
          </Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
        <section className="text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            The School Operating System
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Scholareer helps Nigerian schools manage students, academics, results, finance,
            attendance, library and more — all in one place. It works offline, keeps every
            school&apos;s data private, and is ready to use right from this device.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/login">
                <LayoutDashboard className="mr-2 h-5 w-5" /> Go to Dashboard
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await loadDemo();
                  toast.success(
                    seeded ? "Demo school is already loaded" : "All Saints Anglican College loaded",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load Demo School
            </Button>
          </div>
        </section>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [GraduationCap, "Students, classes, subjects and teachers"],
            [ShieldCheck, "Result engine with approval and access control (RACE)"],
            [Wallet, "Fees, payments, receipts and balances"],
            [CheckCircle2, "Attendance, library, visitors, ID cards and reports"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof GraduationCap;
            return (
              <div key={label as string} className="surface-card flex items-start gap-3 p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <I className="h-4 w-4" />
                </span>
                <p className="text-sm">{label as string}</p>
              </div>
            );
          })}
        </section>

        <section className="surface-card mx-auto mt-12 max-w-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Try the demo</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">
                Sign in <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Load the demo school, then sign in with any of these accounts to explore Scholareer.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {DEMO_ACCOUNTS.map((account) => (
                  <tr key={account.email} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-medium">{account.role}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{account.email}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{account.pass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            All data is stored securely on this device and remains available offline.
          </p>
        </section>
      </main>
    </div>
  );
}

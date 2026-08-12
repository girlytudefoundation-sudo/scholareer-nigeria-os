import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
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
  component: Onboarding,
});

const STEPS = [
  {
    title: "Welcome to Scholareer",
    body: "The School Operating System built for Nigerian schools. Everything you need to run academics, finance and administration in one place — working online and offline.",
  },
  {
    title: "School information",
    body: "Each school in Scholareer has its own profile: name, code, logo, address, principal, proprietor and motto. Data is isolated per school, so no school ever sees another school's records.",
  },
  {
    title: "Academic session",
    body: "Set your current session, term and resumption date. Results, fees and attendance are all recorded against the active session and term.",
  },
  {
    title: "Create or select classes",
    body: "Create classes from Creche and Nursery through Primary, JSS and SSS with arms A, B and C. Each class can carry its own subject structure and result rules.",
  },
  {
    title: "Your dashboard",
    body: "Live statistics calculated from your own records: enrolment, attendance, fee collection, results pending approval and more.",
  },
];

function Onboarding() {
  const { user, loading, seeded, loadDemo } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const current = STEPS[step]!;

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
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl">{current.title}</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{current.body}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button asChild>
                <Link to="/login">Go to sign in</Link>
              </Button>
            )}
            <Button
              variant="secondary"
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

          <div className="mt-6 flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                aria-label={`Go to step ${i + 1}`}
                onClick={() => setStep(i)}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </section>

        <section className="surface-card space-y-4 p-6">
          <h2 className="font-display text-base font-bold">What you get</h2>
          {[
            [GraduationCap, "Students, classes, subjects and teachers"],
            [ShieldCheck, "Result engine with approval and access control (RACE)"],
            [Wallet, "Fees, payments, receipts and balances"],
            [CheckCircle2, "Attendance, library, visitors, ID cards and reports"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof GraduationCap;
            return (
              <div key={label as string} className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <I className="h-4 w-4" />
                </span>
                <p className="text-sm">{label as string}</p>
              </div>
            );
          })}
          <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            All data is stored securely on this device and remains available offline.
          </p>
        </section>
      </main>
    </div>
  );
}

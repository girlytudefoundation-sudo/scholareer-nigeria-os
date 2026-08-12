import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Scholareer School OS" },
      { name: "description", content: "Sign in to Scholareer, the school operating system." },
      { property: "og:title", content: "Sign in — Scholareer School OS" },
      { property: "og:description", content: "Where Scholarship Meets Career." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(1, "Password is required").max(72),
});

const DEMO = [
  ["Super Admin", "superadmin@scholareer.local"],
  ["School Admin", "admin@asac.local"],
  ["Principal", "principal@asac.local"],
  ["Cashier", "cashier@asac.local"],
  ["Teacher", "teacher@asac.local"],
];

function LoginPage() {
  const { signIn, user, loading, seeded, loadDemo } = useAuth();
  const [busy, setBusy] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      await signIn(values.email, values.password);
      toast.success("Welcome back to Scholareer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="brand-gradient hidden flex-col justify-between p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight">SCHOLAREER</p>
            <p className="text-xs uppercase tracking-widest opacity-80">The School OS</p>
          </div>
        </div>
        <div>
          <h2 className="font-display max-w-md text-4xl font-extrabold leading-tight">
            Where Scholarship Meets Career.
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-90">
            One operating system for students, academics, results, finance, library and
            administration — built for Nigerian schools, working online and offline.
          </p>
        </div>
        <p className="text-xs opacity-70">Multi-school · Offline-first · Secure by role</p>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="brand-gradient grid h-9 w-9 place-items-center rounded-xl">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="font-display text-base font-extrabold">SCHOLAREER</p>
          </div>
          <h1 className="font-display text-2xl font-extrabold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your school workspace with your staff account.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-xl border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo credentials
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Password for all demo accounts: <span className="font-semibold">Admin123!</span>
            </p>
            <div className="mt-3 grid gap-1.5">
              {DEMO.map(([role, email]) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => {
                    form.setValue("email", email as string);
                    form.setValue("password", "Admin123!");
                  }}
                  className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                >
                  <span className="font-medium">{role}</span>
                  <span className="truncate text-muted-foreground">{email}</span>
                </button>
              ))}
            </div>
            {!seeded && (
              <Button
                variant="secondary"
                className="mt-3 w-full"
                onClick={async () => {
                  await loadDemo();
                  toast.success("Demo school loaded");
                }}
              >
                Load Demo School
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            New here? <Link to="/" className="font-medium text-primary underline">Start onboarding</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

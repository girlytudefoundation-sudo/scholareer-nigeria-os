import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authenticateStudent,
  readStudentSession,
  writeStudentSession,
} from "@/lib/student-portal";

export const Route = createFileRoute("/student/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Student Result Checker — Scholareer" },
      {
        name: "description",
        content:
          "Students check their term results with a registration number and school-issued password, view analytics and print the official report card.",
      },
      { property: "og:title", content: "Student Result Checker — Scholareer" },
      {
        property: "og:description",
        content: "Check your result, see your analytics and print your report card.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentLoginPage,
});

function StudentLoginPage() {
  const navigate = useNavigate();
  const [regNumber, setRegNumber] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (readStudentSession()) navigate({ to: "/student/portal", replace: true });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await authenticateStudent(regNumber, password);
      writeStudentSession(session);
      await navigate({ to: "/student/portal", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check result.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="brand-gradient mx-auto grid h-12 w-12 place-items-center rounded-2xl">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display mt-3 text-xl font-extrabold tracking-tight">
            Student Result Checker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your registration number and the password your school gave you.
          </p>
        </div>

        <form onSubmit={submit} className="surface-card space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="reg">Registration number</Label>
            <Input
              id="reg"
              autoComplete="username"
              placeholder="e.g. ASAC/2025/0001"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              maxLength={60}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={80}
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-1.5 h-4 w-4" />
            )}
            Check result
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Staff member?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

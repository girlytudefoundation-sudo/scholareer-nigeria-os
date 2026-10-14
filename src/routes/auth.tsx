import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Platform sign in — Scholareer" },
      { name: "description", content: "Secure sign in for Scholareer platform owners and school administrators." },
      { property: "og:title", content: "Platform sign in — Scholareer" },
      { property: "og:description", content: "Knowledge Beyond Borders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  fullName: z.string().trim().max(120).optional(),
});

const ownerEmail = "imohtalit@gmail.com";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [busy, setBusy] = useState(false);
  const canSetUpOwner = form.email.trim().toLowerCase() === ownerEmail;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/account", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message);
      return;
    }
    if (mode === "up" && parsed.data.email.toLowerCase() !== ownerEmail) {
      toast.error("Platform setup is restricted to the designated owner account.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
        if (error) throw error;
        navigate({ to: "/account", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email, password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin + "/account", data: { full_name: parsed.data.fullName ?? "" } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/account", replace: true });
        else toast.success("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <div className="surface-card w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-lg font-extrabold">Scholareer Platform</h1>
            <p className="text-xs text-muted-foreground">Knowledge Beyond Borders</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && (
            <div className="space-y-1">
              <Label htmlFor="fn">Full name</Label>
              <Input id="fn" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="em">Email</Label>
            <Input id="em" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        {mode === "in" && canSetUpOwner ? (
          <Button type="button" variant="link" className="mt-3 w-full" onClick={() => setMode("up")}>
            Set up the platform owner account
          </Button>
        ) : mode === "up" ? (
          <Button type="button" variant="link" className="mt-3 w-full" onClick={() => setMode("in")}>
            Already have an account? Sign in
          </Button>
        ) : null}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}

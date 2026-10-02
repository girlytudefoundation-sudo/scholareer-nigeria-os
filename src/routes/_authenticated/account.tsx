import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/platform";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your account — Scholareer" },
      { name: "description", content: "Your Scholareer platform account and school access." },
      { property: "og:title", content: "Your account — Scholareer" },
      { property: "og:description", content: "Platform account and school access." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["account"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const [{ data: isAdmin }, { data: ownerExists }, { data: memberships }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: uid, _role: "super_admin" }),
        supabase.rpc("platform_owner_exists"),
        supabase.from("school_members").select("role, schools(id, name, code, status, status_reason)").eq("user_id", uid),
      ]);
      return { email: u.user!.email, isAdmin: !!isAdmin, ownerExists: !!ownerExists, memberships: memberships ?? [] };
    },
  });

  useEffect(() => {
    if (data?.isAdmin) navigate({ to: "/admin", replace: true });
  }, [data?.isAdmin, navigate]);

  async function claim() {
    setClaiming(true);
    const { data: ok, error } = await supabase.rpc("claim_platform_owner");
    setClaiming(false);
    if (error || !ok) return toast.error("The platform already has an owner.");
    toast.success("You are now the platform owner.");
    qc.invalidateQueries();
    refetch();
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !data || data.isAdmin) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold">Your account</h1>
          <p className="truncate text-sm text-muted-foreground">{data.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
      </div>

      {!data.ownerExists && (
        <div className="surface-card mb-4 p-5">
          <h2 className="font-semibold">Set up the platform</h2>
          <p className="mt-1 text-sm text-muted-foreground">No platform owner exists yet. Claim ownership to manage schools, subscriptions and billing. This can only be done once.</p>
          <Button className="mt-3" onClick={claim} disabled={claiming}>
            {claiming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Become platform owner
          </Button>
        </div>
      )}

      <div className="surface-card p-5">
        <h2 className="font-semibold">Your schools</h2>
        {data.memberships.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">You are not linked to any school yet. Ask the Scholareer team to add you.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.memberships.map((m: any) => (
              <li key={m.schools.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{m.schools.name}</span>
                  <Badge variant={STATUS_VARIANT[m.schools.status]}>{STATUS_LABEL[m.schools.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Code {m.schools.code} · role {m.role.replace("_", " ")}</p>
                {["paused", "suspended"].includes(m.schools.status) ? (
                  <p className="mt-2 text-sm text-destructive">This school's access is restricted{m.schools.status_reason ? `: ${m.schools.status_reason}` : ""}. Please contact Scholareer.</p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Your school workspace is being moved to the cloud. Until then, use the <Link to="/login" className="text-primary hover:underline">school workspace sign-in</Link>.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

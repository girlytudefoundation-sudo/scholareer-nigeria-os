import { createFileRoute, Link, Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, LayoutDashboard, Loader2, LogOut, ScrollText, Settings, Tags } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIsSuperAdmin } from "@/lib/platform";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/schools", label: "Schools", icon: Building2 },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/plans", label: "Plans", icon: Tags },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
] as const;

function AdminLayout() {
  const { data: isAdmin, isLoading } = useIsSuperAdmin();
  const qc = useQueryClient();
  const navigate = useNavigate();

  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/account" replace />;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold">Scholareer · Super Admin</p>
            <p className="text-xs text-muted-foreground">Platform control</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n }}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              activeProps={{ className: "bg-primary/10 text-primary font-medium" }}
            >
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6"><Outlet /></main>
    </div>
  );
}

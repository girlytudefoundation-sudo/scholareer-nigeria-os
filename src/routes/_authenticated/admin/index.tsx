import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { naira } from "@/lib/constants";
import { STATUS_LABEL, STATUS_VARIANT, errMsg, usePlatformData } from "@/lib/platform";
import { runBillingCheck } from "@/lib/platform.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Platform overview — Scholareer Super Admin" },
      { name: "description", content: "Schools, subscriptions and platform revenue at a glance." },
      { property: "og:title", content: "Platform overview — Scholareer Super Admin" },
      { property: "og:description", content: "Platform control for Scholareer." },
    ],
  }),
  component: Overview,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}

function Overview() {
  const { data, isLoading } = usePlatformData();
  const check = useServerFn(runBillingCheck);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (isLoading || !data) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  const count = (s: string) => data.schools.filter((x) => x.status === s).length;
  const revenue = data.billing.reduce((a, b) => a + b.paid, 0);
  const outstanding = data.billing.reduce((a, b) => a + b.outstanding, 0);
  const pending = data.pays.filter((p) => p.verification === "pending").length;

  async function runCheck() {
    setBusy(true);
    try {
      const r = await check();
      toast.success(`Billing check done: ${r.overdue} marked overdue, ${r.suspended} suspended.`);
      qc.invalidateQueries({ queryKey: ["platform"] });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Live figures from your schools and verified subscription payments."
        actions={<Button variant="outline" onClick={runCheck} disabled={busy}>{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}Run billing check</Button>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Schools" value={data.schools.length} />
        <Stat label="Active / trial" value={`${count("active")} / ${count("trial")}`} />
        <Stat label="Overdue" value={count("overdue")} />
        <Stat label="Paused / suspended" value={`${count("paused")} / ${count("suspended")}`} />
        <Stat label="Verified revenue" value={naira(revenue)} />
        <Stat label="Outstanding" value={naira(outstanding)} />
        <Stat label="Payments awaiting verification" value={pending} />
        <Stat label="Active plans" value={data.plans.filter((p) => p.is_active).length} />
      </div>

      <div className="surface-card mt-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Schools needing attention</h2>
          <Link to="/admin/schools" className="text-sm text-primary hover:underline">All schools</Link>
        </div>
        {data.billing.filter((b) => b.outstanding > 0 || b.school.status !== "active").length === 0 ? (
          <p className="text-sm text-muted-foreground">{data.schools.length ? "Every school is active and paid up." : "No schools yet. Add your first school."}</p>
        ) : (
          <ul className="divide-y">
            {data.billing.filter((b) => b.outstanding > 0 || b.school.status !== "active").slice(0, 8).map((b) => (
              <li key={b.school.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link to="/admin/schools/$schoolId" params={{ schoolId: b.school.id }} className="font-medium hover:underline">{b.school.name}</Link>
                <div className="flex items-center gap-2 text-sm">
                  {b.outstanding > 0 && <span className="text-muted-foreground">Owes {naira(b.outstanding)}</span>}
                  <Badge variant={STATUS_VARIANT[b.school.status]}>{STATUS_LABEL[b.school.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

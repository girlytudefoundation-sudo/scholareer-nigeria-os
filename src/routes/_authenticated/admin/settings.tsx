import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { errMsg, usePlatformData } from "@/lib/platform";
import { updatePlatformSettings } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Platform settings — Scholareer Super Admin" },
      { name: "description", content: "Grace period and automatic overdue/suspension rules." },
      { property: "og:title", content: "Platform settings — Scholareer Super Admin" },
      { property: "og:description", content: "Billing policy settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isLoading } = usePlatformData();
  const save = useServerFn(updatePlatformSettings);
  const qc = useQueryClient();
  const [f, setF] = useState({ gracePeriodDays: 14, autoMarkOverdue: true, autoSuspendAfterGrace: false, suspendBlocksResultChecker: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const s = data?.settings;
    if (s) setF({ gracePeriodDays: s.grace_period_days, autoMarkOverdue: s.auto_mark_overdue, autoSuspendAfterGrace: s.auto_suspend_after_grace, suspendBlocksResultChecker: s.suspend_blocks_result_checker });
  }, [data?.settings]);
  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  const Row = ({ k, label, hint }: { k: "autoMarkOverdue" | "autoSuspendAfterGrace" | "suspendBlocksResultChecker"; label: string; hint: string }) => (
    <label className="flex items-start justify-between gap-4 py-3">
      <span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground">{hint}</span></span>
      <Switch checked={f[k]} onCheckedChange={(v) => setF({ ...f, [k]: v })} />
    </label>
  );

  return (
    <>
      <PageHeader title="Platform settings" description="Rules used by the billing check." />
      <div className="surface-card max-w-xl divide-y p-4">
        <div className="space-y-1 pb-3"><Label>Grace period (days after subscription ends)</Label><Input type="number" min={0} max={365} value={f.gracePeriodDays} onChange={(e) => setF({ ...f, gracePeriodDays: Number(e.target.value) })} className="w-32" /></div>
        <Row k="autoMarkOverdue" label="Automatically mark unpaid schools overdue" hint="Overdue schools keep full access." />
        <Row k="autoSuspendAfterGrace" label="Automatically suspend after the grace period" hint="Never applied while a payment is awaiting verification." />
        <Row k="suspendBlocksResultChecker" label="Suspension blocks the student result checker" hint="Students of suspended schools cannot check results." />
        <div className="pt-3">
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            try { await save({ data: f }); toast.success("Settings saved."); qc.invalidateQueries({ queryKey: ["platform"] }); }
            catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
          }}>Save settings</Button>
        </div>
      </div>
    </>
  );
}

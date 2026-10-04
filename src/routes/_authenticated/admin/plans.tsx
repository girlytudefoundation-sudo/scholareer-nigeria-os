import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { naira } from "@/lib/constants";
import { errMsg, usePlatformData } from "@/lib/platform";
import { savePlan } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({
    meta: [
      { title: "Subscription plans — Scholareer Super Admin" },
      { name: "description", content: "Configure pricing, duration, student limits and features." },
      { property: "og:title", content: "Subscription plans — Scholareer Super Admin" },
      { property: "og:description", content: "Plan configuration." },
    ],
  }),
  component: PlansPage,
});

const blank = { id: undefined as string | undefined, name: "", billingCycle: "termly", price: "0", durationDays: "120", studentLimit: "500", features: "", isActive: true };

function PlansPage() {
  const { data, isLoading } = usePlatformData();
  const save = useServerFn(savePlan);
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof blank | null>(null);
  const [busy, setBusy] = useState(false);
  if (isLoading || !data) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  async function submit() {
    if (!form) return;
    setBusy(true);
    try {
      await save({ data: {
        ...(form.id ? { id: form.id } : {}), name: form.name, billingCycle: form.billingCycle as never,
        price: Number(form.price), durationDays: Number(form.durationDays), studentLimit: Number(form.studentLimit),
        features: form.features.split(",").map((x) => x.trim()).filter(Boolean), isActive: form.isActive,
      } });
      toast.success("Plan saved."); setForm(null); qc.invalidateQueries({ queryKey: ["platform"] });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Subscription plans" description="Prices and limits applied when you assign a plan to a school." actions={<Button onClick={() => setForm({ ...blank })}><Plus className="mr-1 h-4 w-4" />New plan</Button>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.plans.map((p) => (
          <div key={p.id} className="surface-card p-4">
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{p.name}</h3>{!p.is_active && <Badge variant="outline">Inactive</Badge>}</div>
            <p className="mt-1 font-display text-2xl font-extrabold">{naira(Number(p.price))}</p>
            <p className="text-xs text-muted-foreground capitalize">{p.billing_cycle} · {p.duration_days} days · up to {p.student_limit} students</p>
            <p className="mt-2 text-sm">{p.features.join(", ") || "—"}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setForm({ id: p.id, name: p.name, billingCycle: p.billing_cycle, price: String(p.price), durationDays: String(p.duration_days), studentLimit: String(p.student_limit), features: p.features.join(", "), isActive: p.is_active })}>Edit</Button>
          </div>
        ))}
      </div>
      <Dialog open={!!form} onOpenChange={() => setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
          {form && <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Billing cycle</Label>
              <Select value={form.billingCycle} onValueChange={(v) => setForm({ ...form, billingCycle: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["trial", "monthly", "termly", "annual", "custom"].map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label>Price (₦)</Label><Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="space-y-1"><Label>Duration (days)</Label><Input type="number" min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} /></div>
            <div className="space-y-1"><Label>Student limit</Label><Input type="number" min={1} value={form.studentLimit} onChange={(e) => setForm({ ...form, studentLimit: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Features (comma separated)</Label><Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />Available for new subscriptions</label>
          </div>}
          <DialogFooter><Button disabled={busy} onClick={submit}>Save plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

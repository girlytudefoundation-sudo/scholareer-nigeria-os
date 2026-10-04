import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { naira } from "@/lib/constants";
import { STATUS_LABEL, STATUS_VARIANT, errMsg, usePlatformData } from "@/lib/platform";
import {
  assignSubscription, deleteSchool, exportSchool, recordSubscriptionPayment,
  setPaymentVerification, setSchoolStatus, updateSchool,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/admin/schools/$schoolId")({
  head: () => ({
    meta: [
      { title: "School details — Scholareer Super Admin" },
      { name: "description", content: "Manage a school's status, subscription, payments and data." },
      { property: "og:title", content: "School details — Scholareer Super Admin" },
      { property: "og:description", content: "School lifecycle and billing." },
    ],
  }),
  component: SchoolDetail,
});

const today = () => new Date().toISOString().slice(0, 10);

function SchoolDetail() {
  const { schoolId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = usePlatformData();
  const members = useQuery({
    queryKey: ["platform", "members", schoolId],
    queryFn: async () => {
      const { data: m } = await supabase.from("school_members").select("*").eq("school_id", schoolId);
      const ids = (m ?? []).map((x) => x.user_id);
      const { data: p } = ids.length ? await supabase.from("profiles").select("*").in("id", ids) : { data: [] };
      return (m ?? []).map((x) => ({ ...x, profile: (p ?? []).find((y) => y.id === x.user_id) }));
    },
  });

  const fnStatus = useServerFn(setSchoolStatus);
  const fnUpdate = useServerFn(updateSchool);
  const fnAssign = useServerFn(assignSubscription);
  const fnPay = useServerFn(recordSubscriptionPayment);
  const fnVerify = useServerFn(setPaymentVerification);
  const fnExport = useServerFn(exportSchool);
  const fnDelete = useServerFn(deleteSchool);

  const [dialog, setDialog] = useState<null | "status" | "edit" | "sub" | "pay" | "delete">(null);
  const [busy, setBusy] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: "suspended", reason: "" });
  const [edit, setEdit] = useState<any>(null);
  const [sub, setSub] = useState({ planId: "", startsOn: today(), amountDue: "", notes: "" });
  const [pay, setPay] = useState({ amount: "", paidOn: today(), method: "Bank transfer", reference: "", verified: false });
  const [del, setDel] = useState({ confirmName: "", acknowledgeDebt: false });

  const b = data?.billing.find((x) => x.school.id === schoolId);
  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  if (!b || !data) return <p className="text-sm">School not found. <Link to="/admin/schools" className="text-primary">Back to schools</Link></p>;
  const s = b.school;
  const subs = data.subs.filter((x) => x.school_id === s.id);
  const pays = data.pays.filter((x) => x.school_id === s.id);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); setDialog(null); qc.invalidateQueries({ queryKey: ["platform"] }); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  async function download() {
    try {
      const json = await fnExport({ data: { schoolId: s.id } });
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `${s.code}-export-${today()}.json` });
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(errMsg(e)); }
  }

  const restricted = ["paused", "suspended"].includes(s.status);

  return (
    <>
      <Link to="/admin/schools" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" />Schools</Link>
      <PageHeader
        title={s.name}
        description={`${s.code} · ${s.school_type}${s.state ? ` · ${s.state}` : ""}`}
        actions={<>
          <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
          <Button variant="outline" size="sm" onClick={() => { setEdit({ name: s.name, email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", state: s.state ?? "", schoolType: s.school_type }); setDialog("edit"); }}>Edit</Button>
          {restricted ? (
            <Button size="sm" onClick={() => run(() => fnStatus({ data: { schoolId: s.id, status: "active", reason: "" } }), "School reactivated.")}>Reactivate</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => { setStatusForm({ status: "suspended", reason: "" }); setDialog("status"); }}>Suspend / pause</Button>
          )}
        </>}
      />
      {restricted && s.status_reason && <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">Reason: {s.status_reason}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Amount due", naira(b.due)], ["Verified paid", naira(b.paid)], ["Outstanding", naira(b.outstanding)], ["Last payment", b.lastPayment ?? "—"]].map(([l, v]) => (
          <div key={l} className="surface-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-display text-lg font-extrabold">{v}</p></div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Subscriptions</h2><Button size="sm" variant="outline" onClick={() => setDialog("sub")}>Assign plan</Button></div>
          {subs.length === 0 ? <p className="text-sm text-muted-foreground">No subscriptions.</p> : (
            <ul className="divide-y text-sm">{subs.map((x) => (
              <li key={x.id} className="py-2"><div className="flex justify-between gap-2"><span className="font-medium">{x.plan_name}</span><span>{naira(Number(x.amount_due))}</span></div>
                <p className="text-xs text-muted-foreground">{x.starts_on} → {x.ends_on} · {x.billing_cycle}{x.notes ? ` · ${x.notes}` : ""}</p></li>
            ))}</ul>
          )}
        </section>

        <section className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Payments</h2><Button size="sm" variant="outline" onClick={() => setDialog("pay")}>Record payment</Button></div>
          {pays.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : (
            <ul className="divide-y text-sm">{pays.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div><p className="font-medium">{naira(Number(p.amount))} <span className="text-xs font-normal text-muted-foreground">· {p.method}</span></p><p className="text-xs text-muted-foreground">{p.paid_on} · Ref {p.reference}</p></div>
                <Select value={p.verification} onValueChange={(v) => run(() => fnVerify({ data: { paymentId: p.id, verification: v as never } }), "Payment updated.")}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                </Select>
              </li>
            ))}</ul>
          )}
        </section>

        <section className="surface-card p-4">
          <h2 className="mb-2 font-semibold">People</h2>
          {(members.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No linked accounts.</p> : (
            <ul className="divide-y text-sm">{members.data!.map((m) => (
              <li key={m.id} className="flex justify-between gap-2 py-2"><span className="truncate">{m.profile?.full_name || m.profile?.email}</span><span className="text-muted-foreground">{m.role.replace("_", " ")}</span></li>
            ))}</ul>
          )}
          <dl className="mt-4 grid grid-cols-3 gap-1 text-sm">
            <dt className="text-muted-foreground">Email</dt><dd className="col-span-2 truncate">{s.email ?? "—"}</dd>
            <dt className="text-muted-foreground">Phone</dt><dd className="col-span-2">{s.phone || "—"}</dd>
            <dt className="text-muted-foreground">Address</dt><dd className="col-span-2">{s.address || "—"}</dd>
          </dl>
        </section>

        <section className="surface-card border-destructive/30 p-4">
          <h2 className="mb-2 font-semibold">Data & deletion</h2>
          <p className="text-sm text-muted-foreground">Download a full backup before any permanent deletion.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={download}><Download className="mr-1 h-4 w-4" />Export data</Button>
            <Button variant="destructive" size="sm" onClick={() => { setDel({ confirmName: "", acknowledgeDebt: false }); setDialog("delete"); }}><Trash2 className="mr-1 h-4 w-4" />Delete school</Button>
          </div>
        </section>
      </div>

      <Dialog open={dialog === "status"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restrict {s.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={statusForm.status} onValueChange={(v) => setStatusForm({ ...statusForm, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="suspended">Suspend</SelectItem><SelectItem value="paused">Pause</SelectItem><SelectItem value="overdue">Mark overdue (no restriction)</SelectItem></SelectContent>
            </Select>
            <div className="space-y-1"><Label>Reason</Label><Textarea value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Suspended or paused schools keep all their data but staff and students lose restricted access until reactivated.</p>
          </div>
          <DialogFooter><Button disabled={busy} onClick={() => run(() => fnStatus({ data: { schoolId: s.id, status: statusForm.status as never, reason: statusForm.reason } }), "Status updated.")}>Confirm</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "edit"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit school</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3 sm:grid-cols-2">
            {(["name", "email", "phone", "state", "address", "schoolType"] as const).map((k) => (
              <div key={k} className="space-y-1"><Label className="capitalize">{k === "schoolType" ? "Type" : k}</Label><Input value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
            ))}
          </div>}
          <DialogFooter><Button disabled={busy} onClick={() => run(() => fnUpdate({ data: { schoolId: s.id, ...edit } }), "School updated.")}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "sub"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign subscription</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={sub.planId} onValueChange={(v) => setSub({ ...sub, planId: v })}>
              <SelectTrigger><SelectValue placeholder="Choose plan" /></SelectTrigger>
              <SelectContent>{data.plans.filter((p) => p.is_active).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {naira(Number(p.price))}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start date</Label><Input type="date" value={sub.startsOn} onChange={(e) => setSub({ ...sub, startsOn: e.target.value })} /></div>
              <div className="space-y-1"><Label>Custom amount (optional)</Label><Input type="number" min={0} value={sub.amountDue} onChange={(e) => setSub({ ...sub, amountDue: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={sub.notes} onChange={(e) => setSub({ ...sub, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button disabled={busy || !sub.planId} onClick={() => run(() => fnAssign({ data: { schoolId: s.id, planId: sub.planId, startsOn: sub.startsOn, notes: sub.notes, ...(sub.amountDue !== "" ? { amountDue: Number(sub.amountDue) } : {}) } }), "Subscription assigned.")}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "pay"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record offline payment</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Amount (₦)</Label><Input type="number" min={1} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Date paid</Label><Input type="date" value={pay.paidOn} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} /></div>
            <div className="space-y-1"><Label>Method</Label>
              <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Bank transfer", "Cash", "Cheque", "POS", "Other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label>Reference no.</Label><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={pay.verified} onCheckedChange={(v) => setPay({ ...pay, verified: !!v })} />I have confirmed this money was received</label>
          </div>
          <DialogFooter><Button disabled={busy} onClick={() => run(() => fnPay({ data: { schoolId: s.id, amount: Number(pay.amount), paidOn: pay.paidOn, method: pay.method, reference: pay.reference, verified: pay.verified } }), "Payment recorded.")}>Save payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">Permanently delete {s.name}?</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>This permanently removes the school, its staff links, subscriptions and payment history. Student records, results and other school information linked to it will also be lost. This cannot be undone — export the data first.</p>
            {b.outstanding > 0 && (
              <label className="flex items-start gap-2 rounded-md border border-destructive/40 p-3"><Checkbox checked={del.acknowledgeDebt} onCheckedChange={(v) => setDel({ ...del, acknowledgeDebt: !!v })} /><span>This school still owes <b>{naira(b.outstanding)}</b>. I understand and want to delete anyway.</span></label>
            )}
            <div className="space-y-1"><Label>Type the school name to confirm: <b>{s.name}</b></Label><Input value={del.confirmName} onChange={(e) => setDel({ ...del, confirmName: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="destructive" disabled={busy || del.confirmName.trim() !== s.name.trim()} onClick={async () => {
              setBusy(true);
              try { await fnDelete({ data: { schoolId: s.id, ...del } }); toast.success("School deleted."); qc.invalidateQueries({ queryKey: ["platform"] }); navigate({ to: "/admin/schools" }); }
              catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
            }}>Delete permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

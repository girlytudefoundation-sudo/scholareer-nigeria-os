import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { naira } from "@/lib/constants";
import { STATUS_LABEL, STATUS_VARIANT, errMsg, usePlatformData } from "@/lib/platform";
import { createSchool } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/admin/schools/")({
  head: () => ({
    meta: [
      { title: "Schools — Scholareer Super Admin" },
      { name: "description", content: "Register, search and manage schools on Scholareer." },
      { property: "og:title", content: "Schools — Scholareer Super Admin" },
      { property: "og:description", content: "School registry and lifecycle." },
    ],
  }),
  component: SchoolsPage,
});

const blank = { name: "", code: "", email: "", phone: "", address: "", state: "", schoolType: "Secondary", planId: "", adminName: "", adminEmail: "" };

function SchoolsPage() {
  const { data, isLoading } = usePlatformData();
  const create = useServerFn(createSchool);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ email: string; password: string | null } | null>(null);

  const rows = useMemo(() => (data?.billing ?? []).filter((b) =>
    (status === "all" || b.school.status === status) &&
    `${b.school.name} ${b.school.code} ${b.school.state ?? ""}`.toLowerCase().includes(q.toLowerCase())), [data, q, status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.planId) {
      toast.error("Choose a subscription plan.");
      return;
    }
    setBusy(true);
    try {
      const r = await create({ data: { ...form, code: form.code.toUpperCase() } });
      setOpen(false);
      setForm(blank);
      setIssued({ email: r.adminEmail, password: r.temporaryPassword });
      qc.invalidateQueries({ queryKey: ["platform"] });
      toast.success("School created.");
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }

  const f = (k: keyof typeof blank) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <>
      <PageHeader title="Schools" description="Every school on the platform, with status and billing." actions={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Register school</Button>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search name, code or state" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : rows.length === 0 ? (
        <EmptyState title="No schools found" hint="Register a school to give it its own workspace." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>School</TableHead><TableHead>Status</TableHead><TableHead>Plan</TableHead><TableHead>Renews</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.school.id}>
                  <TableCell>
                    <Link to="/admin/schools/$schoolId" params={{ schoolId: b.school.id }} className="font-medium hover:underline">{b.school.name}</Link>
                    <p className="text-xs text-muted-foreground">{b.school.code}{b.school.state ? ` · ${b.school.state}` : ""}</p>
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[b.school.status]}>{STATUS_LABEL[b.school.status]}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap">{b.current?.plan_name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.current?.ends_on ?? "—"}{b.expired && <span className="ml-1 text-xs text-destructive">expired</span>}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">{naira(b.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Register a school</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label>School name</Label><Input required {...f("name")} /></div>
            <div className="space-y-1"><Label>School code</Label><Input required placeholder="e.g. ASAC" {...f("code")} /></div>
            <div className="space-y-1"><Label>Type</Label>
              <Select value={form.schoolType} onValueChange={(v) => setForm({ ...form, schoolType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Nursery", "Primary", "Nursery & Primary", "Secondary", "Primary & Secondary"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>School email</Label><Input type="email" required {...f("email")} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input {...f("phone")} /></div>
            <div className="space-y-1"><Label>State</Label><Input {...f("state")} /></div>
            <div className="space-y-1"><Label>Address</Label><Input {...f("address")} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Subscription plan</Label>
              <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>{(data?.plans ?? []).filter((p) => p.is_active).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {naira(Number(p.price))}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-sm font-medium sm:col-span-2">School administrator</p>
            <div className="space-y-1"><Label>Full name</Label><Input required {...f("adminName")} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" required {...f("adminEmail")} /></div>
            <DialogFooter className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create school</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issued} onOpenChange={() => setIssued(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Administrator access</DialogTitle></DialogHeader>
          {issued?.password ? (
            <div className="space-y-2 text-sm">
              <p>Share these sign-in details with the administrator securely. The password is shown only once.</p>
              <div className="rounded-md bg-muted p-3 font-mono text-xs">
                <p>Email: {issued.email}</p>
                <p>Temporary password: {issued.password}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${issued.email}\n${issued.password}`); toast.success("Copied"); }}><Copy className="mr-1 h-4 w-4" />Copy</Button>
            </div>
          ) : (
            <p className="text-sm">{issued?.email} already had an account and has been linked to this school.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

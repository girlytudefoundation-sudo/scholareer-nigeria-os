import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { naira } from "@/lib/constants";
import { errMsg, usePlatformData } from "@/lib/platform";
import { setPaymentVerification } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "Subscription payments — Scholareer Super Admin" },
      { name: "description", content: "Verify school subscription payments (platform revenue)." },
      { property: "og:title", content: "Subscription payments — Scholareer Super Admin" },
      { property: "og:description", content: "Platform revenue ledger." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data, isLoading } = usePlatformData();
  const verify = useServerFn(setPaymentVerification);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  if (isLoading || !data) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  const rows = data.pays.filter((p) => filter === "all" || p.verification === filter);
  const nameOf = (id: string) => data.schools.find((s) => s.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader title="Subscription payments" description="Platform revenue only — separate from fees schools collect from parents." actions={
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
      } />
      {rows.length === 0 ? <EmptyState title="No payments" hint="Record payments from a school's page." /> : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>School</TableHead><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell><Link to="/admin/schools/$schoolId" params={{ schoolId: p.school_id }} className="hover:underline">{nameOf(p.school_id)}</Link></TableCell>
                <TableCell className="whitespace-nowrap">{p.paid_on}</TableCell>
                <TableCell>{p.reference}</TableCell>
                <TableCell>{p.method}</TableCell>
                <TableCell className="whitespace-nowrap text-right">{naira(Number(p.amount))}</TableCell>
                <TableCell>
                  <Select value={p.verification} onValueChange={async (v) => {
                    try { await verify({ data: { paymentId: p.id, verification: v as never } }); toast.success("Updated"); qc.invalidateQueries({ queryKey: ["platform"] }); }
                    catch (e) { toast.error(errMsg(e)); }
                  }}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

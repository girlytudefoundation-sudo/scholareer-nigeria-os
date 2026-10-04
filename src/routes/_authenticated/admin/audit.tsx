import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/common/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Platform audit log — Scholareer Super Admin" },
      { name: "description", content: "Every Super Admin action, recorded permanently." },
      { property: "og:title", content: "Platform audit log — Scholareer Super Admin" },
      { property: "og:description", content: "Platform audit trail." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  const rows = (data ?? []).filter((r) => `${r.action} ${r.school_name ?? ""} ${r.actor_email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Audit log" description="Latest 500 platform actions." actions={<Input placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />} />
      {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : rows.length === 0 ? <EmptyState title="No entries" /> : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>School</TableHead><TableHead>By</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString("en-NG")}</TableCell>
                <TableCell className="whitespace-nowrap font-medium">{r.action.replaceAll("_", " ").toLowerCase()}</TableCell>
                <TableCell>{r.school_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.actor_email ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{JSON.stringify(r.details)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

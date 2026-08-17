import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgData } from "@/hooks/use-data";
import { downloadCSV, toCSV } from "@/lib/csv";

export const Route = createFileRoute("/_shell/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — Scholareer School OS" },
      { name: "description", content: "Immutable trail of every action taken inside the school." },
      { property: "og:title", content: "Audit Log — Scholareer School OS" },
      { property: "og:description", content: "Who did what, when — full accountability trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const { data } = useOrgData();
  const [query, setQuery] = useState("");

  const logs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(data?.auditLogs ?? [])]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .filter((l) =>
        q ? `${l.user} ${l.action} ${l.entity} ${l.details ?? ""}`.toLowerCase().includes(q) : true,
      );
  }, [data?.auditLogs, query]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description={`${logs.length} recorded actions`}
        actions={
          logs.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCSV(
                  "audit-log.csv",
                  toCSV(
                    logs.map((l) => ({
                      timestamp: l.timestamp,
                      user: l.user,
                      action: l.action,
                      entity: l.entity,
                      entityId: l.entityId,
                      details: l.details ?? "",
                    })),
                  ),
                )
              }
            >
              Export CSV
            </Button>
          )
        }
      />

      <div className="surface-card mb-4 p-4">
        <Input
          placeholder="Search by user, action or entity"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {logs.length === 0 ? (
        <EmptyState title="No activity yet" hint="Actions across the school will appear here." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.slice(0, 300).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(l.timestamp).toLocaleString("en-NG")}
                  </TableCell>
                  <TableCell className="font-medium">{l.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{l.action}</Badge>
                  </TableCell>
                  <TableCell>{l.entity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.details ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

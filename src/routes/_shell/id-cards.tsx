import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgData } from "@/hooks/use-data";
import { printElement } from "@/lib/csv";

export const Route = createFileRoute("/_shell/id-cards")({
  head: () => ({
    meta: [
      { title: "ID Cards — Scholareer School OS" },
      { name: "description", content: "Generate and print student identity cards by class." },
      { property: "og:title", content: "ID Cards — Scholareer School OS" },
      { property: "og:description", content: "Batch-print school ID cards with student details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdCardsPage,
});

function IdCardsPage() {
  const { data } = useOrgData();
  const org = data?.organization;
  const classes = data?.classes ?? [];
  const [classId, setClassId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!classId && classes[0]) setClassId(classes[0].id);
  }, [classes, classId]);

  const students = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.students ?? [])
      .filter((s) => s.classId === classId && s.status === "ACTIVE")
      .filter((s) => (q ? `${s.firstName} ${s.lastName} ${s.admissionNumber}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [data?.students, classId, query]);

  const className = classes.find((c) => c.id === classId)?.name ?? "";

  return (
    <div>
      <PageHeader
        title="ID Cards"
        description={`${students.length} cards ready`}
        actions={
          students.length > 0 && (
            <Button size="sm" onClick={() => printElement("id-card-sheet", "Student ID Cards")}>
              <Printer className="mr-1.5 h-4 w-4" /> Print cards
            </Button>
          )
        }
      />

      <div className="surface-card mb-4 grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Search</Label>
          <Input
            placeholder="Filter by name or admission number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState title="No students to print" hint="Pick a class with enrolled students." />
      ) : (
        <div id="id-card-sheet" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => (
            <article
              key={s.id}
              className="overflow-hidden rounded-xl border bg-card shadow-sm"
              style={{ breakInside: "avoid" }}
            >
              <div className="bg-primary px-4 py-2 text-primary-foreground">
                <p className="truncate text-sm font-extrabold">{org?.name}</p>
                <p className="truncate text-[10px] opacity-80">{org?.motto}</p>
              </div>
              <div className="flex gap-3 p-3">
                <div className="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-xs text-muted-foreground">
                  {s.passport ? (
                    <img src={s.passport} alt={`${s.firstName} ${s.lastName}`} className="h-full w-full object-cover" />
                  ) : (
                    "Photo"
                  )}
                </div>
                <dl className="min-w-0 flex-1 space-y-0.5 text-xs">
                  <p className="truncate text-sm font-bold">
                    {s.lastName} {s.firstName}
                  </p>
                  <Row k="Adm. no." v={s.admissionNumber} />
                  <Row k="Class" v={`${className}`} />
                  <Row k="Gender" v={s.gender} />
                  <Row k="House" v={s.house ?? "—"} />
                  <Row k="Guardian" v={s.parentPhone} />
                </dl>
              </div>
              <p className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
                {org?.address} · Valid for {org?.currentSession}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate font-medium">{v}</dd>
    </div>
  );
}

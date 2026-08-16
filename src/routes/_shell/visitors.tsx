import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { IdCard, LogOut, Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgData } from "@/hooks/use-data";
import { useAuth } from "@/lib/auth";
import { visitorService } from "@/services";

export const Route = createFileRoute("/_shell/visitors")({
  head: () => ({
    meta: [
      { title: "Visitors — Scholareer School OS" },
      { name: "description", content: "Front-desk visitor log with check-in and check-out." },
      { property: "og:title", content: "Visitors — Scholareer School OS" },
      { property: "og:description", content: "Track everyone entering and leaving the school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VisitorsPage,
});

const empty = {
  name: "",
  phone: "",
  purpose: "",
  personToVisit: "",
  idType: "National ID",
  idNumber: "",
};

function VisitorsPage() {
  const { data, orgId } = useOrgData();
  const { has } = useAuth();
  const canManage = has("visitors.manage");
  const visitors = [...(data?.visitors ?? [])].sort((a, b) => b.timeIn.localeCompare(a.timeIn));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });

  const inside = visitors.filter((v) => v.status === "IN").length;
  const today = visitors.filter((v) => v.timeIn.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  async function checkIn() {
    if (!orgId) return;
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    await visitorService.create({
      organizationId: orgId,
      ...form,
      timeIn: new Date().toISOString(),
      status: "IN",
    });
    toast.success("Visitor checked in");
    setForm({ ...empty });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Visitors"
        description="Front-desk register"
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Check in visitor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Visitor check-in</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <F label="Full name">
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </F>
                  <F label="Phone">
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </F>
                  <F label="Purpose">
                    <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
                  </F>
                  <F label="Person to visit">
                    <Input
                      value={form.personToVisit}
                      onChange={(e) => setForm({ ...form, personToVisit: e.target.value })}
                    />
                  </F>
                  <F label="ID type">
                    <Input value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })} />
                  </F>
                  <F label="ID number">
                    <Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
                  </F>
                </div>
                <DialogFooter>
                  <Button onClick={checkIn}>Check in</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="On premises" value={inside} tone="warning" icon={IdCard} />
        <StatCard label="Today" value={today} tone="primary" />
        <StatCard label="All time" value={visitors.length} />
      </div>

      {visitors.length === 0 ? (
        <EmptyState title="No visitors logged" hint="Check in a visitor to start the register." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>To see</TableHead>
                <TableHead>Time in</TableHead>
                <TableHead>Time out</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.phone}</TableCell>
                  <TableCell>{v.purpose}</TableCell>
                  <TableCell>{v.personToVisit}</TableCell>
                  <TableCell>{new Date(v.timeIn).toLocaleString("en-NG")}</TableCell>
                  <TableCell>{v.timeOut ? new Date(v.timeOut).toLocaleTimeString("en-NG") : "—"}</TableCell>
                  <TableCell className="text-right">
                    {v.status === "IN" && canManage ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await visitorService.checkOut(v.id);
                          toast.success("Visitor checked out");
                        }}
                      >
                        <LogOut className="mr-1.5 h-4 w-4" /> Check out
                      </Button>
                    ) : (
                      <Badge variant={v.status === "IN" ? "outline" : "secondary"}>{v.status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

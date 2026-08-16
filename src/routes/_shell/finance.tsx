import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Coins, Plus, Printer, Receipt, TrendingUp, Trash2 } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { audit, balanceFor, feeService, paymentService } from "@/services";
import { naira, TERMS } from "@/lib/constants";
import { downloadCSV, printElement, toCSV } from "@/lib/csv";
import type { PaymentMethod } from "@/db/types";

export const Route = createFileRoute("/_shell/finance")({
  head: () => ({
    meta: [
      { title: "Finance — Scholareer School OS" },
      { name: "description", content: "School fees, payments, receipts and debtor tracking." },
      { property: "og:title", content: "Finance — Scholareer School OS" },
      { property: "og:description", content: "Record payments, issue receipts and track balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancePage,
});

const METHODS: PaymentMethod[] = ["CASH", "POS", "BANK_TRANSFER", "ONLINE"];

function FinancePage() {
  const { data, orgId } = useOrgData();
  const { user, has } = useAuth();
  const org = data?.organization;
  const session = org?.currentSession ?? "";
  const term = org?.currentTerm ?? TERMS[0]!;

  const students = data?.students ?? [];
  const classes = data?.classes ?? [];
  const fees = data?.fees ?? [];
  const payments = data?.payments ?? [];
  const canRecord = has("finance.record");

  const [payOpen, setPayOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [pay, setPay] = useState({
    studentId: "",
    amount: "",
    method: "CASH",
    reference: "",
    description: "School fees",
  });
  const [fee, setFee] = useState({ classId: "", title: "Tuition", amount: "" });

  const ledger = useMemo(
    () =>
      students
        .filter((s) => s.status === "ACTIVE")
        .map((s) => ({
          student: s,
          ...balanceFor(s.id, s.classId, fees, payments, session, term),
        })),
    [students, fees, payments, session, term],
  );

  const expected = ledger.reduce((a, b) => a + b.totalFees, 0);
  const collected = ledger.reduce((a, b) => a + b.paid, 0);
  const outstanding = ledger.reduce((a, b) => a + b.balance, 0);
  const debtors = ledger.filter((l) => l.balance > 0).length;

  const termPayments = useMemo(
    () =>
      payments
        .filter((p) => p.session === session && p.term === term)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [payments, session, term],
  );

  const receipt = termPayments.find((p) => p.id === receiptId) ?? null;
  const receiptStudent = students.find((s) => s.id === receipt?.studentId);

  async function recordPayment() {
    if (!orgId) return;
    const amount = Number(pay.amount);
    if (!pay.studentId || !amount || amount <= 0) {
      toast.error("Select a student and enter a valid amount.");
      return;
    }
    const created = await paymentService.create({
      organizationId: orgId,
      receiptNumber: `RCP/${new Date().getFullYear()}/${String(payments.length + 1).padStart(4, "0")}`,
      studentId: pay.studentId,
      session,
      term,
      amount,
      date: new Date().toISOString(),
      method: pay.method as PaymentMethod,
      reference: pay.reference || undefined,
      description: pay.description || undefined,
      cashier: user?.name ?? "System",
    });
    await audit(orgId, user?.name ?? "System", "PAYMENT", "Payment", created.receiptNumber, naira(amount));
    toast.success(`Payment recorded — ${created.receiptNumber}`);
    setPay({ studentId: "", amount: "", method: "CASH", reference: "", description: "School fees" });
    setPayOpen(false);
    setReceiptId(created.id);
  }

  async function addFee() {
    if (!orgId) return;
    const amount = Number(fee.amount);
    if (!fee.classId || !amount) {
      toast.error("Select a class and enter an amount.");
      return;
    }
    await feeService.create({
      organizationId: orgId,
      classId: fee.classId,
      session,
      term,
      title: fee.title,
      amount,
    });
    toast.success("Fee item added");
    setFee({ classId: "", title: "Tuition", amount: "" });
    setFeeOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Finance"
        description={`${session} · ${term}`}
        actions={
          canRecord && (
            <>
              <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Coins className="mr-1.5 h-4 w-4" /> Fee item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add fee item</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Class</Label>
                      <Select value={fee.classId} onValueChange={(v) => setFee({ ...fee, classId: v })}>
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
                      <Label className="text-xs">Title</Label>
                      <Input value={fee.title} onChange={(e) => setFee({ ...fee, title: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount (₦)</Label>
                      <Input
                        type="number"
                        value={fee.amount}
                        onChange={(e) => setFee({ ...fee, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={addFee}>Save fee</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Record payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record payment</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Student</Label>
                      <Select
                        value={pay.studentId}
                        onValueChange={(v) => setPay({ ...pay, studentId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.lastName} {s.firstName} — {s.admissionNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount (₦)</Label>
                      <Input
                        type="number"
                        value={pay.amount}
                        onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Method</Label>
                      <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Reference / teller</Label>
                      <Input
                        value={pay.reference}
                        onChange={(e) => setPay({ ...pay, reference: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={recordPayment}>Save & issue receipt</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Expected" value={naira(expected)} tone="primary" icon={TrendingUp} />
        <StatCard label="Collected" value={naira(collected)} tone="success" icon={Coins} />
        <StatCard label="Outstanding" value={naira(outstanding)} tone="danger" />
        <StatCard label="Debtors" value={debtors} tone="warning" hint="Students owing this term" />
      </div>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Student ledger</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="fees">Fee structure</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCSV(
                  "fee-ledger.csv",
                  toCSV(
                    ledger.map((l) => ({
                      admissionNumber: l.student.admissionNumber,
                      name: `${l.student.lastName} ${l.student.firstName}`,
                      expected: l.totalFees,
                      paid: l.paid,
                      balance: l.balance,
                      status: l.status,
                    })),
                  ),
                )
              }
            >
              Export CSV
            </Button>
          </div>
          {ledger.length === 0 ? (
            <EmptyState title="No students yet" />
          ) : (
            <div className="surface-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((l) => (
                    <TableRow key={l.student.id}>
                      <TableCell className="font-medium">
                        {l.student.lastName} {l.student.firstName}
                      </TableCell>
                      <TableCell>{classes.find((c) => c.id === l.student.classId)?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">{naira(l.totalFees)}</TableCell>
                      <TableCell className="text-right">{naira(l.paid)}</TableCell>
                      <TableCell className="text-right font-medium">{naira(l.balance)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            l.status === "PAID" ? "secondary" : l.status === "PARTIAL" ? "outline" : "destructive"
                          }
                        >
                          {l.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {termPayments.length === 0 ? (
            <EmptyState title="No payments recorded" hint="Record a payment to issue a receipt." />
          ) : (
            <div className="surface-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termPayments.map((p) => {
                    const s = students.find((x) => x.id === p.studentId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                        <TableCell className="font-medium">
                          {s ? `${s.lastName} ${s.firstName}` : "—"}
                        </TableCell>
                        <TableCell>{new Date(p.date).toLocaleDateString("en-NG")}</TableCell>
                        <TableCell>{p.method.replace("_", " ")}</TableCell>
                        <TableCell className="text-right">{naira(p.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setReceiptId(p.id)}>
                            <Receipt className="mr-1.5 h-4 w-4" /> Receipt
                          </Button>
                          {canRecord && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Delete payment"
                              onClick={async () => {
                                if (!confirm("Delete this payment?")) return;
                                await paymentService.remove(p.id);
                                toast.success("Payment deleted");
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          {fees.filter((f) => f.session === session && f.term === term).length === 0 ? (
            <EmptyState title="No fee items" hint="Add fee items per class for this term." />
          ) : (
            <div className="surface-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees
                    .filter((f) => f.session === session && f.term === term)
                    .map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>{classes.find((c) => c.id === f.classId)?.name ?? "—"}</TableCell>
                        <TableCell className="font-medium">{f.title}</TableCell>
                        <TableCell className="text-right">{naira(f.amount)}</TableCell>
                        <TableCell className="text-right">
                          {canRecord && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Delete fee"
                              onClick={async () => {
                                await feeService.remove(f.id);
                                toast.success("Fee item removed");
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceiptId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment receipt</DialogTitle>
          </DialogHeader>
          {receipt && (
            <div id="receipt-print" className="rounded-lg border p-4 text-sm">
              <p className="font-display text-center text-base font-extrabold">{org?.name}</p>
              <p className="text-center text-xs text-muted-foreground">{org?.address}</p>
              <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide">
                Official payment receipt
              </p>
              <dl className="mt-3 space-y-1.5">
                <Row k="Receipt no." v={receipt.receiptNumber} />
                <Row
                  k="Student"
                  v={receiptStudent ? `${receiptStudent.lastName} ${receiptStudent.firstName}` : "—"}
                />
                <Row k="Admission no." v={receiptStudent?.admissionNumber ?? "—"} />
                <Row k="Session / term" v={`${receipt.session} · ${receipt.term}`} />
                <Row k="Method" v={receipt.method.replace("_", " ")} />
                <Row k="Date" v={new Date(receipt.date).toLocaleString("en-NG")} />
                <Row k="Amount" v={naira(receipt.amount)} />
                <Row k="Received by" v={receipt.cashier} />
              </dl>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => printElement("receipt-print", "Receipt")}>
              <Printer className="mr-1.5 h-4 w-4" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

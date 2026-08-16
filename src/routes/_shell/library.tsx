import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Undo2 } from "lucide-react";
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
import { libraryService } from "@/services";

export const Route = createFileRoute("/_shell/library")({
  head: () => ({
    meta: [
      { title: "Library — Scholareer School OS" },
      { name: "description", content: "Catalogue books, lend to students and track returns." },
      { property: "og:title", content: "Library — Scholareer School OS" },
      { property: "og:description", content: "Book catalogue, borrowings and overdue tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, orgId } = useOrgData();
  const { has } = useAuth();
  const canManage = has("library.manage");
  const books = data?.books ?? [];
  const borrowings = data?.borrowings ?? [];
  const students = data?.students ?? [];

  const [bookOpen, setBookOpen] = useState(false);
  const [lendOpen, setLendOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [book, setBook] = useState({ isbn: "", title: "", author: "", category: "General", quantity: "1" });
  const [lend, setLend] = useState({ studentId: "", bookId: "", days: "14" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => (q ? `${b.title} ${b.author} ${b.isbn}`.toLowerCase().includes(q) : true));
  }, [books, query]);

  const active = borrowings.filter((b) => b.status === "BORROWED");
  const overdue = active.filter((b) => new Date(b.dueDate) < new Date());

  async function addBook() {
    if (!orgId) return;
    const qty = Number(book.quantity) || 1;
    if (!book.title.trim()) {
      toast.error("Book title is required.");
      return;
    }
    await libraryService.addBook({
      organizationId: orgId,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      category: book.category,
      quantity: qty,
      available: qty,
    });
    toast.success("Book added to catalogue");
    setBook({ isbn: "", title: "", author: "", category: "General", quantity: "1" });
    setBookOpen(false);
  }

  async function lendBook() {
    if (!orgId) return;
    if (!lend.studentId || !lend.bookId) {
      toast.error("Select a student and a book.");
      return;
    }
    const due = new Date();
    due.setDate(due.getDate() + (Number(lend.days) || 14));
    try {
      await libraryService.borrow({
        organizationId: orgId,
        studentId: lend.studentId,
        bookId: lend.bookId,
        borrowedAt: new Date().toISOString(),
        dueDate: due.toISOString(),
        status: "BORROWED",
      });
      toast.success("Book issued");
      setLend({ studentId: "", bookId: "", days: "14" });
      setLendOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Library"
        description={`${books.length} titles · ${active.length} on loan`}
        actions={
          canManage && (
            <>
              <Dialog open={bookOpen} onOpenChange={setBookOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1.5 h-4 w-4" /> Add book
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add book</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Title">
                      <Input value={book.title} onChange={(e) => setBook({ ...book, title: e.target.value })} />
                    </Field>
                    <Field label="Author">
                      <Input value={book.author} onChange={(e) => setBook({ ...book, author: e.target.value })} />
                    </Field>
                    <Field label="ISBN">
                      <Input value={book.isbn} onChange={(e) => setBook({ ...book, isbn: e.target.value })} />
                    </Field>
                    <Field label="Category">
                      <Input value={book.category} onChange={(e) => setBook({ ...book, category: e.target.value })} />
                    </Field>
                    <Field label="Quantity">
                      <Input
                        type="number"
                        value={book.quantity}
                        onChange={(e) => setBook({ ...book, quantity: e.target.value })}
                      />
                    </Field>
                  </div>
                  <DialogFooter>
                    <Button onClick={addBook}>Save book</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={lendOpen} onOpenChange={setLendOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <BookOpen className="mr-1.5 h-4 w-4" /> Issue book
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Issue book to student</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Field label="Student">
                      <Select value={lend.studentId} onValueChange={(v) => setLend({ ...lend, studentId: v })}>
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
                    </Field>
                    <Field label="Book">
                      <Select value={lend.bookId} onValueChange={(v) => setLend({ ...lend, bookId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select book" />
                        </SelectTrigger>
                        <SelectContent>
                          {books
                            .filter((b) => b.available > 0)
                            .map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.title} ({b.available} available)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Loan period (days)">
                      <Input
                        type="number"
                        value={lend.days}
                        onChange={(e) => setLend({ ...lend, days: e.target.value })}
                      />
                    </Field>
                  </div>
                  <DialogFooter>
                    <Button onClick={lendBook}>Issue book</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Titles" value={books.length} tone="primary" icon={BookOpen} />
        <StatCard label="Copies" value={books.reduce((a, b) => a + b.quantity, 0)} />
        <StatCard label="On loan" value={active.length} tone="warning" />
        <StatCard label="Overdue" value={overdue.length} tone="danger" />
      </div>

      <Tabs defaultValue="catalogue">
        <TabsList>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="loans">Borrowings</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="mt-4">
          <div className="surface-card mb-4 p-4">
            <Input
              placeholder="Search by title, author or ISBN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No books yet" hint="Add titles to build your library catalogue." />
          ) : (
            <div className="surface-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell>{b.author}</TableCell>
                      <TableCell>{b.category}</TableCell>
                      <TableCell className="text-right">
                        {b.available}/{b.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${b.title}`}
                            onClick={async () => {
                              if (!confirm(`Remove ${b.title}?`)) return;
                              await libraryService.removeBook(b.id);
                              toast.success("Book removed");
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

        <TabsContent value="loans" className="mt-4">
          {borrowings.length === 0 ? (
            <EmptyState title="No borrowings" hint="Issue a book to a student to get started." />
          ) : (
            <div className="surface-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...borrowings]
                    .sort((a, b) => b.borrowedAt.localeCompare(a.borrowedAt))
                    .map((br) => {
                      const s = students.find((x) => x.id === br.studentId);
                      const bk = books.find((x) => x.id === br.bookId);
                      const late = br.status === "BORROWED" && new Date(br.dueDate) < new Date();
                      return (
                        <TableRow key={br.id}>
                          <TableCell className="font-medium">
                            {s ? `${s.lastName} ${s.firstName}` : "—"}
                          </TableCell>
                          <TableCell>{bk?.title ?? "—"}</TableCell>
                          <TableCell>{new Date(br.borrowedAt).toLocaleDateString("en-NG")}</TableCell>
                          <TableCell>{new Date(br.dueDate).toLocaleDateString("en-NG")}</TableCell>
                          <TableCell>
                            <Badge variant={late ? "destructive" : br.status === "RETURNED" ? "secondary" : "outline"}>
                              {late ? "OVERDUE" : br.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage && br.status === "BORROWED" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await libraryService.giveBack(br.id);
                                  toast.success("Book returned");
                                }}
                              >
                                <Undo2 className="mr-1.5 h-4 w-4" /> Return
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
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

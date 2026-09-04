import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useOrgData } from "@/hooks/use-data";
import { naira } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data } = useOrgData();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showFinance = can(user?.role, "finance.view");

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search students, teachers, classes, payments, books, visitors…" />
      <CommandList>
        <CommandEmpty>No matching records found.</CommandEmpty>

        <CommandGroup heading="Students">
          {(data?.students ?? []).slice(0, 50).map((s) => (
            <CommandItem
              key={s.id}
              value={`student ${s.firstName} ${s.lastName} ${s.admissionNumber}`}
              onSelect={() => go(`/students/${s.id}`)}
            >
              {s.firstName} {s.lastName}
              <span className="ml-auto text-xs text-muted-foreground">{s.admissionNumber}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Teachers">
          {(data?.teachers ?? []).map((t) => (
            <CommandItem
              key={t.id}
              value={`teacher ${t.firstName} ${t.lastName} ${t.staffId}`}
              onSelect={() => go("/teachers")}
            >
              {t.firstName} {t.lastName}
              <span className="ml-auto text-xs text-muted-foreground">{t.staffId}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Classes">
          {(data?.classes ?? []).map((c) => (
            <CommandItem key={c.id} value={`class ${c.name}`} onSelect={() => go("/classes")}>
              {c.name}
              <span className="ml-auto text-xs text-muted-foreground">{c.level}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {showFinance && (
          <CommandGroup heading="Payments & Receipts">
            {(data?.payments ?? []).slice(0, 40).map((p) => {
              const st = data?.students.find((s) => s.id === p.studentId);
              return (
                <CommandItem
                  key={p.id}
                  value={`payment receipt ${p.receiptNumber} ${st?.firstName ?? ""} ${st?.lastName ?? ""}`}
                  onSelect={() => go("/finance/payments")}
                >
                  {p.receiptNumber} · {st?.firstName} {st?.lastName}
                  <span className="ml-auto text-xs text-muted-foreground">{naira(p.amount)}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Books">
          {(data?.books ?? []).map((b) => (
            <CommandItem key={b.id} value={`book ${b.title} ${b.author}`} onSelect={() => go("/library")}>
              {b.title}
              <span className="ml-auto text-xs text-muted-foreground">{b.author}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Visitors">
          {(data?.visitors ?? []).map((v) => (
            <CommandItem key={v.id} value={`visitor ${v.name} ${v.purpose}`} onSelect={() => go("/visitors")}>
              {v.name}
              <span className="ml-auto text-xs text-muted-foreground">{v.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

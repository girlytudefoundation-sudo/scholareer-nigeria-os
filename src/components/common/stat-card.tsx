import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="font-display mt-1.5 text-xl font-extrabold break-words sm:text-2xl">
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", tones[tone])}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
      </div>
    </div>
  );
}

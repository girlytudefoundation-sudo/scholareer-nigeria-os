import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/image";

interface Props {
  passport?: string | undefined;
  firstName: string;
  lastName: string;
  className?: string;
}

/** Passport photo with a professional initials fallback (never a broken image). */
export function StudentAvatar({ passport, firstName, lastName, className }: Props) {
  const base =
    "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary text-secondary-foreground";
  if (passport) {
    return (
      <img
        src={passport}
        alt={`${firstName} ${lastName} passport photograph`}
        className={cn(base, "object-cover", className ?? "h-9 w-9")}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(base, "font-semibold", className ?? "h-9 w-9")}
    >
      <span className="text-[0.7em] leading-none">{initialsOf(firstName, lastName)}</span>
    </div>
  );
}

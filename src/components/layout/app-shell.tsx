import { useMemo, useState } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  WifiOff,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth";
import { useOnline, useTheme } from "@/hooks/use-theme";
import { useOrgData } from "@/hooks/use-data";
import { NAV_ITEMS, useActivePath } from "./nav-items";
import { GlobalSearch } from "./global-search";
import { notificationService } from "@/services";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-xl">
        <GraduationCap className="h-5 w-5 text-primary-foreground" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="font-display truncate text-sm font-extrabold tracking-tight text-sidebar-foreground">
            SCHOLAREER
          </p>
          <p className="truncate text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
            School OS
          </p>
        </div>
      )}
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { has } = useAuth();
  const { data } = useOrgData();
  const path = useActivePath();
  const modules = data?.settings?.modules;

  const groups = useMemo(() => {
    const visible = NAV_ITEMS.filter(
      (i) => has(i.permission) && (!i.module || modules?.[i.module] !== false),
    );
    const map = new Map<string, typeof visible>();
    visible.forEach((i) => map.set(i.group, [...(map.get(i.group) ?? []), i]));
    return [...map.entries()];
  }, [has, modules]);

  return (
    <nav className="space-y-5 px-3 py-2" aria-label="Main navigation">
      {groups.map(([group, items]) => (
        <div key={group}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/45">
            {group}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NotificationBell() {
  const { data, orgId } = useOrgData();
  const items = [...(data?.notifications ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const unread = items.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {orgId && unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => notificationService.markAllRead(orgId)}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-80">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
          {items.slice(0, 20).map((n) => (
            <div key={n.id} className="border-b px-3 py-2.5 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.read && <Badge variant="secondary">New</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell() {
  const { user, org, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const online = useOnline();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <ScrollArea className="flex-1">
          <NavLinks />
        </ScrollArea>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate text-xs text-sidebar-foreground/70">{org?.name}</p>
          <p className="truncate text-[10px] text-sidebar-foreground/45">
            {org?.currentSession} · {org?.currentTerm}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b bg-card/95 px-3 backdrop-blur sm:px-5">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                  <Brand />
                </div>
                <ScrollArea className="h-[calc(100vh-4rem)]">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <span className="font-display hidden text-sm font-bold sm:block">
              {org?.name ?? "Scholareer"}
            </span>
          </div>

          <div className="min-w-0">
            <Button
              variant="outline"
              onClick={() => setSearchOpen(true)}
              className="w-full max-w-sm justify-start gap-2 text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="truncate text-sm">Search students, staff, payments…</span>
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {!online && (
              <Badge variant="secondary" className="hidden gap-1 sm:flex">
                <WifiOff className="h-3 w-3" /> Offline
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user?.name?.slice(0, 1)}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate">{user?.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {user ? ROLE_LABELS[user.role] : ""}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    signOut();
                    navigate({ to: "/login", replace: true });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {!online && (
          <div className="no-print bg-warning px-4 py-1.5 text-center text-xs font-medium text-warning-foreground">
            Offline Mode — Your data is saved on this device.
          </div>
        )}

        <main className="min-w-0 flex-1 px-3 py-5 pb-24 sm:px-6 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileBottomNav />
    </div>
  );
}

function MobileBottomNav() {
  const { has } = useAuth();
  const path = useActivePath();
  const items = NAV_ITEMS.filter((i) => has(i.permission)).slice(0, 5);
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-flow-col border-t bg-card/95 backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = path === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate px-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

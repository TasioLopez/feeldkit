"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  BookOpen,
  Database,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const mainNav: NavItem[] = [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }];

const dataNav: NavItem[] = [
  { href: "/dashboard/packs", label: "Packs", icon: Package },
  { href: "/dashboard/imports", label: "Imports", icon: Database },
];

const opsNav: NavItem[] = [{ href: "/dashboard/reviews", label: "Reviews", icon: ListTodo }];

const platformNav: NavItem[] = [
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/docs", label: "Docs", icon: BookOpen },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}

function NavSection({ title, items, collapsed }: { title: string; items: NavItem[]; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} collapsed />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} collapsed={false} />
      ))}
    </div>
  );
}

export function DashboardAppShell({ userEmail, children }: { userEmail: string | null; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarInner = (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-3">
        <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", collapsed && "justify-center w-full")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary">FK</span>
          {!collapsed ? <span className="truncate text-sidebar-foreground">FeeldKit</span> : null}
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
        <div className="space-y-1">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>
        <NavSection title="Data" items={dataNav} collapsed={collapsed} />
        <NavSection title="Operations" items={opsNav} collapsed={collapsed} />
        <NavSection title="Platform" items={platformNav} collapsed={collapsed} />
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("w-full text-muted-foreground hover:text-foreground", collapsed && "px-2")}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed ? <span className="ml-2">Collapse</span> : null}
        </Button>
        {userEmail ? (
          <p className={cn("mt-2 truncate px-1 text-xs text-muted-foreground", collapsed && "text-center")} title={userEmail}>
            {!collapsed ? userEmail : "·"}
          </p>
        ) : null}
        <form action="/auth/signout" method="post" className="mt-2">
          <Button type="submit" variant="outline" size="sm" className={cn("w-full", collapsed && "px-2")}>
            {!collapsed ? "Sign out" : "Out"}
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col transition-[width] duration-200 ease-out",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden transition-opacity",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-lg transition-transform duration-200 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-end border-b border-sidebar-border px-2">
          <Button type="button" variant="ghost" size="sm" className="size-9 p-0" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
            <div className="space-y-1">
              {mainNav.map((item) => (
                <NavLink key={item.href} item={item} collapsed={false} />
              ))}
            </div>
            <NavSection title="Data" items={dataNav} collapsed={false} />
            <NavSection title="Operations" items={opsNav} collapsed={false} />
            <NavSection title="Platform" items={platformNav} collapsed={false} />
          </nav>
          <div className="border-t border-sidebar-border p-3">
            {userEmail ? <p className="truncate px-1 text-xs text-muted-foreground">{userEmail}</p> : null}
            <form action="/auth/signout" method="post" className="mt-2">
              <Button type="submit" variant="outline" size="sm" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="md:hidden size-9 p-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex flex-1 items-center justify-end gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

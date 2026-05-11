"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BookOpen, Code2, KeyRound, LayoutDashboard, Settings, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const navItems: NavItem[] = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/developer", label: "Developer", icon: Code2 },
  { href: "/app/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

function AppNavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppShell({
  userEmail,
  organizationName,
  orgRole,
  children,
}: {
  userEmail: string | null;
  organizationName: string | null;
  orgRole: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface-canvas text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link href="/app" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/80 p-1">
              <BrandLogo className="size-5" priority />
            </span>
            <span>FeeldKit</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <AppNavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate text-xs font-medium text-sidebar-foreground">{organizationName ?? "Workspace"}</p>
          <p className="truncate text-xs text-muted-foreground">{orgRole ?? "viewer"}</p>
          {userEmail ? <p className="mt-2 truncate text-xs text-muted-foreground">{userEmail}</p> : null}
          <form action="/auth/signout" method="post" className="mt-3">
            <Button type="submit" variant="outline" size="sm" className="w-full rounded-lg">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
          <Link href="/app" className="flex items-center gap-2 font-semibold">
            <BrandLogo className="size-6" />
            FeeldKit
          </Link>
          <Button type="button" variant="ghost" size="sm" className="size-9 p-0" aria-label="Menu">
            <X className="size-5" />
          </Button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

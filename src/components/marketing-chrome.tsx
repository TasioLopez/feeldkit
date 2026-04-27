import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { env } from "@/lib/config/env";
import { cn } from "@/lib/cn";

export function MarketingChrome({ children, className }: { children: ReactNode; className?: string }) {
  const showAdmin = env.NEXT_PUBLIC_SHOW_ADMIN_LINK === true;

  return (
    <div className={cn("flex min-h-full flex-col bg-background", className)}>
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">FK</span>
            <span>FeeldKit</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <BookOpen className="size-4" aria-hidden />
              <span className="hidden sm:inline">Docs</span>
            </Link>
            {showAdmin ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LayoutDashboard className="size-4" aria-hidden />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            ) : null}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <p>FeeldKit — field intelligence for modern apps.</p>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, LayoutDashboard, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/config/env";
import { cn } from "@/lib/cn";

export function MarketingChrome({ children, className }: { children: ReactNode; className?: string }) {
  const showAdmin = env.NEXT_PUBLIC_SHOW_ADMIN_LINK === true;

  return (
    <div className={cn("premium-surface flex min-h-full flex-col bg-background", className)}>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft text-brand-strong shadow-sm">
              <Sparkles className="size-4" />
            </span>
            <span>FeeldKit</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <BookOpen className="size-4" aria-hidden />
              <span className="hidden sm:inline">Docs</span>
            </Link>
            {showAdmin ? (
              <Button asChild variant="soft" size="sm" className="rounded-full">
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
            ) : null}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border/80 py-9 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <p>FeeldKit — field intelligence for modern apps.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/docs" className="hover:text-foreground">
              API Docs
            </Link>
            {showAdmin ? (
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}

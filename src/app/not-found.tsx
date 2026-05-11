import Link from "next/link";
import { Compass, Home, KeyRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="premium-surface relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <Card variant="feature" className="relative w-full max-w-xl border-border shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand-soft/70 p-1 text-brand-strong">
            <BrandLogo className="size-10" priority />
          </div>
          <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs font-medium text-muted-foreground">
            <Compass className="size-3.5" aria-hidden />
            404
          </div>
          <CardTitle className="text-3xl tracking-tight">Page not found</CardTitle>
          <CardDescription>
            This page does not exist on this FeeldKit surface, or it belongs to a different workspace entry point.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="brand">
            <Link href="/">
              <Home className="size-4" aria-hidden />
              Public home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/login">
              <KeyRound className="size-4" aria-hidden />
              Workspace sign in
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">Operator login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { LoginForm } from "./login-form";
import { env, isSupabaseConfigured } from "@/lib/config/env";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="premium-surface relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="relative grid w-full max-w-4xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card variant="panel" className="hidden lg:block">
          <CardHeader>
            <div className="flex size-11 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/70 text-brand-strong">
              <Sparkles className="size-5" />
            </div>
            <CardTitle className="text-2xl">FeeldKit admin</CardTitle>
            <CardDescription>Secure operational access for packs, imports, reviews, and API key management.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {[
              "Magic-link authentication with organization guardrails",
              "Scoped API key management from a single workspace",
              "Low-confidence review workflows for ongoing quality",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg border border-stroke-soft bg-surface-panel p-3">
                <CheckCircle2 className="mt-0.5 size-4 text-brand-strong" />
                <p>{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card variant="feature" className="w-full border-border shadow-xl">
          <CardHeader className="space-y-1 text-center sm:text-left">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft/70 text-brand-strong sm:mx-0">
              <ShieldCheck className="size-6" />
            </div>
            <Badge variant="glow" className="mx-auto w-fit sm:mx-0">
              Admin access
            </Badge>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Use your work email to receive a secure one-time magic link.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              nextPath={params.next}
              error={params.error}
              supabaseConfigured={isSupabaseConfigured()}
              siteUrl={env.NEXT_PUBLIC_SITE_URL}
            />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/" className="font-medium text-primary hover:underline">
                Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

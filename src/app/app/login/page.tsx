import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { env, isSupabaseConfigured } from "@/lib/config/env";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Workspace sign in | FeeldKit",
  description: "Sign in to your FeeldKit workspace.",
};

export default async function AppLoginPage({
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
      <Card variant="feature" className="relative w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-1 text-center sm:text-left">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft/70 p-1 text-brand-strong sm:mx-0">
            <BrandLogo className="size-9" priority />
          </div>
          <Badge variant="glow" className="mx-auto w-fit sm:mx-0">
            Workspace access
          </Badge>
          <CardTitle className="text-2xl">Sign in to FeeldKit</CardTitle>
          <CardDescription>Use your email to open your mapping workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            nextPath={params.next}
            error={params.error}
            supabaseConfigured={isSupabaseConfigured()}
            siteUrl={env.APP_SITE_URL ?? env.NEXT_PUBLIC_SITE_URL}
            callbackPath="/auth/app/callback"
            defaultNextPath="/app"
            emailHelpText="Use the email tied to your FeeldKit workspace."
            securityNote="This login opens your user workspace. Operator tools remain restricted to the admin dashboard."
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/" className="font-medium text-primary hover:underline">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

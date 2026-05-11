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
  const appSiteUrl = env.APP_SITE_URL ?? (env.NODE_ENV === "production" ? undefined : env.NEXT_PUBLIC_SITE_URL);
  const adminHref = env.ADMIN_SITE_URL ? `${env.ADMIN_SITE_URL.replace(/\/$/, "")}/login` : "/login";

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
          <CardTitle className="text-2xl">Continue to your workspace</CardTitle>
          <CardDescription>New here? We’ll create your workspace the first time you continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            nextPath={params.next}
            error={params.error}
            supabaseConfigured={isSupabaseConfigured()}
            siteUrl={appSiteUrl}
            siteUrlMissingMessage={
              !appSiteUrl && env.NODE_ENV === "production"
                ? "APP_SITE_URL must be set to https://feeldkit.dev for workspace sign-in."
                : undefined
            }
            callbackPath="/auth/app/callback"
            defaultNextPath="/app"
            emailHelpText="Use the email tied to your FeeldKit workspace."
            securityNote="Operator tools remain restricted to admin.feeldkit.dev."
            buttonLabel="Continue with email"
            successMessage="Open the link we sent to continue to your workspace."
            shouldCreateUser
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Looking for the operator console?{" "}
            <Link href={adminHref} className="font-medium text-primary hover:underline">
              Admin sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link href="/" className="font-medium text-primary hover:underline">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

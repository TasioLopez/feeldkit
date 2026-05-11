import Link from "next/link";
import { LoginForm } from "./login-form";
import { env, isSupabaseConfigured } from "@/lib/config/env";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const adminSiteUrl = env.ADMIN_SITE_URL ?? (env.NODE_ENV === "production" ? undefined : env.NEXT_PUBLIC_SITE_URL);
  const workspaceHref = env.APP_SITE_URL ? `${env.APP_SITE_URL.replace(/\/$/, "")}/app/login` : "/app/login";

  return (
    <div className="premium-surface relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="relative grid w-full max-w-4xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card variant="panel" className="hidden lg:block">
          <CardHeader>
            <div className="flex size-11 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/70 p-1 text-brand-strong">
              <BrandLogo className="size-8" priority />
            </div>
            <CardTitle className="text-2xl">FeeldKit operator console</CardTitle>
            <CardDescription>
              Restricted access for platform operators and organization administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {[
              "Governance, imports, review queues, and promotion curation",
              "Allowlisted magic-link authentication for operator access",
              "Workspace users should sign in through the public app surface",
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
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft/70 p-1 text-brand-strong sm:mx-0">
              <BrandLogo className="size-9" priority />
            </div>
            <Badge variant="glow" className="mx-auto w-fit sm:mx-0">
              Operator access
            </Badge>
            <CardTitle className="text-2xl">Admin sign in</CardTitle>
            <CardDescription>Use an allowlisted operator email to receive a secure one-time magic link.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              nextPath={params.next}
              error={params.error}
              supabaseConfigured={isSupabaseConfigured()}
              siteUrl={adminSiteUrl}
              siteUrlMissingMessage={
                !adminSiteUrl && env.NODE_ENV === "production"
                  ? "ADMIN_SITE_URL must be set to https://admin.feeldkit.dev for operator sign-in."
                  : undefined
              }
              emailHelpText="Use an allowlisted platform or organization administrator email."
              securityNote="This console is restricted to allowlisted admin users. Workspace users should sign in through the public app."
              buttonLabel="Send admin sign-in link"
              successMessage="Open the admin sign-in link we sent to finish signing in."
              shouldCreateUser={false}
            />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Need the user workspace?{" "}
              <Link href={workspaceHref} className="font-medium text-primary hover:underline">
                Workspace sign in
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground hover:underline">
                Public home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

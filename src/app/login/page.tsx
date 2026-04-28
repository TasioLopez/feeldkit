import Link from "next/link";
import { LoginForm } from "./login-form";
import { env, isSupabaseConfigured } from "@/lib/config/env";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <Card variant="feature" className="relative w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-1 text-center sm:text-left">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft/70 text-brand-strong sm:mx-0">
            <span className="text-lg font-bold">FK</span>
          </div>
          <Badge variant="brand" className="mx-auto w-fit sm:mx-0">
            Admin access
          </Badge>
          <CardTitle className="text-2xl">FeeldKit admin</CardTitle>
          <CardDescription>Sign in with a magic link and securely manage packs, imports, and API keys.</CardDescription>
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
  );
}

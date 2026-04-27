import Link from "next/link";
import { LoginForm } from "./login-form";
import { env, isSupabaseConfigured } from "@/lib/config/env";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-1 text-center sm:text-left">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary sm:mx-0">
            <span className="text-lg font-bold">FK</span>
          </div>
          <CardTitle className="text-2xl">FeeldKit admin</CardTitle>
          <CardDescription>Sign in with a magic link sent to your email.</CardDescription>
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

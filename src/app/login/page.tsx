import Link from "next/link";
import { LoginForm } from "./login-form";
import { env, isSupabaseConfigured } from "@/lib/config/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">FeeldKit admin</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in with a magic link sent to your email.</p>
        <LoginForm
          nextPath={params.next}
          error={params.error}
          supabaseConfigured={isSupabaseConfigured()}
          siteUrl={env.NEXT_PUBLIC_SITE_URL}
        />
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-teal-700 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

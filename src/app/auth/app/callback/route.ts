import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureAppProfileForUser } from "@/lib/auth/bootstrap-profile";
import { env, isSupabaseConfigured } from "@/lib/config/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = (env.APP_SITE_URL ?? env.NEXT_PUBLIC_SITE_URL ?? url.origin).replace(/\/$/, "");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/app/login?error=missing_supabase", origin));
  }

  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/app";
  const nextPath = nextParam === "/app" || nextParam.startsWith("/app/") ? nextParam : "/app";

  if (!code) {
    return NextResponse.redirect(new URL("/app/login?error=missing_code", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/app/login?error=auth", origin));
  }

  await ensureAppProfileForUser(data.user);

  return NextResponse.redirect(new URL(nextPath, origin));
}

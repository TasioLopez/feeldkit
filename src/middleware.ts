import { type NextRequest, NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/config/env";
import { updateSession } from "@/lib/supabase/middleware";

function hostMatches(request: NextRequest): boolean {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (!env.ADMIN_HOST) {
    return true;
  }
  return host === env.ADMIN_HOST;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/login")) {
    if (!hostMatches(request)) {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!isSupabaseConfigured()) {
      if (env.NODE_ENV === "production") {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "missing_supabase");
        return NextResponse.redirect(url);
      }
      return NextResponse.next({ request });
    }
    return updateSession(request);
  }

  if (pathname.startsWith("/login") && isSupabaseConfigured()) {
    return updateSession(request);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

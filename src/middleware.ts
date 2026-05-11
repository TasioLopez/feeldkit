import { type NextRequest, NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/config/env";
import { updateSession } from "@/lib/supabase/middleware";

function requestHost(request: NextRequest): string {
  return request.headers.get("host")?.split(":")[0] ?? "";
}

function isAdminHost(request: NextRequest): boolean {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (!env.ADMIN_HOST) {
    return true;
  }
  return host === env.ADMIN_HOST;
}

function isPublicAppHost(request: NextRequest): boolean {
  return !env.ADMIN_HOST || requestHost(request) !== env.ADMIN_HOST;
}

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname.startsWith("/app") ? "/app/login" : "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

function themedNotFound(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/__feeldkit_not_found";
  return NextResponse.rewrite(url, { status: 404 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminHost = isAdminHost(request);
  const publicAppHost = isPublicAppHost(request);

  // Keep admin domain focused on auth/dashboard flows.
  if (env.ADMIN_HOST && adminHost && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard") || pathname === "/login" || pathname === "/auth/callback") {
    if (!adminHost) {
      return themedNotFound(request);
    }
  }

  if ((pathname.startsWith("/app") || pathname.startsWith("/auth/app")) && env.ADMIN_HOST && adminHost) {
    if (env.APP_SITE_URL) {
      return NextResponse.redirect(new URL(pathname, env.APP_SITE_URL));
    }
    return themedNotFound(request);
  }

  if (pathname.startsWith("/app") || pathname.startsWith("/auth/app")) {
    if (!publicAppHost) {
      return themedNotFound(request);
    }
  }

  if (pathname.startsWith("/dashboard") || (pathname.startsWith("/app") && pathname !== "/app/login")) {
    if (!isSupabaseConfigured()) {
      if (env.NODE_ENV === "production") {
        const response = redirectToLogin(request, pathname);
        response.headers.set("x-feeldkit-auth-error", "missing_supabase");
        return response;
      }
      return NextResponse.next({ request });
    }
    return updateSession(request);
  }

  if ((pathname === "/login" || pathname === "/app/login") && isSupabaseConfigured()) {
    return updateSession(request);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/auth/callback", "/app/:path*", "/auth/app/callback"],
};

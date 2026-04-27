import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-app";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/packs", label: "Packs" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  { href: "/dashboard/imports", label: "Imports" },
  { href: "/dashboard/docs", label: "Docs" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="font-semibold">
            FeeldKit Dashboard
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded bg-slate-100 px-2 py-1 hover:bg-slate-200">
                {link.label}
              </Link>
            ))}
            {user ? (
              <form action="/auth/signout" method="post" className="inline">
                <button type="submit" className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">
                  Sign out{user.email ? ` (${user.email})` : ""}
                </button>
              </form>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}

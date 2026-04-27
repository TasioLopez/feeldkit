import type { ReactNode } from "react";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server-app";
import { DashboardAppShell } from "@/components/dashboard-app-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return <DashboardAppShell userEmail={user?.email ?? null}>{children}</DashboardAppShell>;
}

import type { ReactNode } from "react";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server-app";
import { canCurateGlobalPromotions, canManageApiKeys, getAdminActorContext } from "@/lib/auth/admin-context";
import { DashboardAppShell } from "@/components/dashboard-app-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const actor = user ? await getAdminActorContext() : null;
  return (
    <DashboardAppShell
      userEmail={user?.email ?? null}
      capabilities={{
        canManageOrg: actor ? canManageApiKeys(actor.orgRole) : false,
        canManageApiKeys: actor ? canManageApiKeys(actor.orgRole) : false,
        canCurateGlobalPromotions: actor ? canCurateGlobalPromotions(actor.platformRole) : false,
      }}
    >
      {children}
    </DashboardAppShell>
  );
}

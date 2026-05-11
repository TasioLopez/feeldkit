import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-app";
import {
  canCurateGlobalPromotions as canCurateGlobalPromotionsForRole,
  canManageApiKeys,
  getAdminActorContext,
} from "@/lib/auth/admin-context";
import { DashboardAppShell } from "@/components/dashboard-app-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const actor = user ? await getAdminActorContext() : null;
  if (!actor) {
    redirect("/login?error=profile");
  }
  const canManageOrg = canManageApiKeys(actor.orgRole);
  const canCurateGlobalPromotions = canCurateGlobalPromotionsForRole(actor.platformRole);
  if (!canManageOrg && !canCurateGlobalPromotions) {
    redirect("/login?error=insufficient_access");
  }

  return (
    <DashboardAppShell
      userEmail={user?.email ?? null}
      capabilities={{
        canManageOrg,
        canManageApiKeys: canManageOrg,
        canCurateGlobalPromotions,
      }}
    >
      {children}
    </DashboardAppShell>
  );
}

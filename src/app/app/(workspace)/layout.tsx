import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-app";
import { getActorContext } from "@/lib/auth/admin-context";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AppWorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    redirect("/app/login");
  }

  const actor = await getActorContext();
  if (!actor) {
    redirect("/app/login?error=profile");
  }

  const admin = getSupabaseServiceClient();
  const { data: org } = admin
    ? await admin.from("organizations").select("name").eq("id", actor.organizationId).maybeSingle()
    : { data: null };

  return (
    <AppShell
      userEmail={user.email ?? actor.email}
      organizationName={(org?.name as string | null | undefined) ?? null}
      orgRole={actor.orgRole}
    >
      {children}
    </AppShell>
  );
}

import type { Metadata } from "next";
import { getActorContext } from "@/lib/auth/admin-context";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings | FeeldKit workspace",
  description: "Workspace identity and role settings.",
};

export default async function AppSettingsPage() {
  const actor = await getActorContext();
  const admin = getSupabaseServiceClient();
  const { data: org } =
    admin && actor
      ? await admin.from("organizations").select("name, slug").eq("id", actor.organizationId).maybeSingle()
      : { data: null };

  return (
    <div className="space-y-6">
      <PageHeader title="Workspace settings" description="Review the organization and role attached to your session." />
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">{(org?.name as string | null | undefined) ?? "Organization"}</CardTitle>
          <CardDescription>Member management and invitations will build on this workspace identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Organization id" value={actor?.organizationId ?? "Unavailable"} />
            <Info label="Organization slug" value={(org?.slug as string | null | undefined) ?? "Not set"} />
            <Info label="Email" value={actor?.email ?? "Unavailable"} />
            <Info label="Membership id" value={actor?.membershipId ?? "Unavailable"} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-mono">
              orgRole: {actor?.orgRole ?? "viewer"}
            </Badge>
            <Badge variant="outline" className="font-mono">
              platformRole: {actor?.platformRole ?? "none"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stroke-soft bg-surface-panel p-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getAdminActorContext, isPlatformAdmin } from "@/lib/auth/admin-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Promoted intelligence registry | FeeldKit",
  description: "Semver changelog of rolled-up promoted decisions.",
};

export default async function PromotionsRegistryPage() {
  const actor = await getAdminActorContext();
  const admin = getSupabaseServiceClient();
  const canView = actor
    ? isPlatformAdmin(actor.role) || ["owner", "admin"].includes(actor.role)
    : false;

  const { data: versions } =
    admin && canView
      ? await admin
          .from("promoted_intelligence_versions")
          .select("id, version, generated_at, stats, changelog")
          .order("generated_at", { ascending: false })
          .limit(50)
      : { data: null };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promoted intelligence registry"
        description="Versions emitted by npm run promote:rollup. Entry-level diffs are available via the public API."
      />

      <Link href="/dashboard/promotions" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
        ← Curator queue
      </Link>

      {!actor ? (
        <EmptyState title="Sign in required" description="Connect Supabase and sign in." />
      ) : !canView ? (
        <EmptyState title="Insufficient access" description="Owner, admin, or platform_admin required." />
      ) : !versions || versions.length === 0 ? (
        <EmptyState
          title="No versions yet"
          description="Run npm run promote:rollup after migrations are applied and promoted_decisions exist."
        />
      ) : (
        <div className="space-y-3">
          {versions.map((v, index) => {
            const stats = (v.stats as Record<string, unknown> | null) ?? {};
            const entryCount = typeof stats.decisions_total === "number" ? stats.decisions_total : "—";
            return (
              <Reveal key={v.id as string} delay={Math.min(index * 0.04, 0.2)}>
                <Card variant="panel">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base font-mono">v{v.version as string}</CardTitle>
                      <Badge variant="outline">{String(v.generated_at)}</Badge>
                    </div>
                    <CardDescription>
                      {entryCount} decisions in this rollup · bump {(stats.bump_kind as string) ?? "—"}
                    </CardDescription>
                    <p className="mt-2 text-xs text-muted-foreground font-mono">
                      API:{" "}
                      <code className="rounded bg-surface-panel px-1">
                        GET /api/v1/promoted-intelligence/versions/{encodeURIComponent(String(v.version))}
                      </code>
                    </p>
                  </CardHeader>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

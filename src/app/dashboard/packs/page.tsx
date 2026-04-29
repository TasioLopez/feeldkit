import Link from "next/link";
import type { Metadata } from "next";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/dashboard/page-header";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getAdminActorContext } from "@/lib/auth/admin-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PacksExpandableTable } from "./packs-expandable-table";

export const metadata: Metadata = {
  title: "Field packs | FeeldKit",
  description: "Browse field packs and versions.",
};

function statusVariant(status: string): "default" | "secondary" | "success" | "warning" | "muted" {
  const s = status.toLowerCase();
  if (s === "active" || s === "published" || s === "ready") return "success";
  if (s === "draft" || s === "beta") return "warning";
  if (s === "deprecated") return "muted";
  return "secondary";
}

export default async function DashboardPacksPage() {
  const repo = getFieldRepository();
  const actor = await getAdminActorContext();
  const admin = getSupabaseServiceClient();
  const packsList = await repo.getPacks();
  const allTypes = await repo.getFieldTypes();
  const { data: versions } = admin
    ? await admin.from("field_pack_versions").select("field_pack_id, created_at").order("created_at", { ascending: false }).limit(1000)
    : { data: [] as Array<{ field_pack_id: string; created_at: string }> };
  const lastIngestByPack = new Map<string, string>();
  for (const row of versions ?? []) {
    if (!lastIngestByPack.has(row.field_pack_id)) {
      lastIngestByPack.set(row.field_pack_id, row.created_at);
    }
  }

  const [reviewRows, proposalRows] =
    admin && actor?.organizationId
      ? await Promise.all([
          admin.from("mapping_reviews").select("field_type_id").eq("organization_id", actor.organizationId).eq("status", "pending"),
          admin
            .from("enrichment_proposals")
            .select("field_type_id")
            .eq("organization_id", actor.organizationId)
            .eq("status", "pending"),
        ])
      : [{ data: [] as Array<{ field_type_id: string }> }, { data: [] as Array<{ field_type_id: string }> }];
  const pendingReviewByType = new Map<string, number>();
  for (const row of reviewRows.data ?? []) {
    pendingReviewByType.set(row.field_type_id, (pendingReviewByType.get(row.field_type_id) ?? 0) + 1);
  }
  const pendingProposalByType = new Map<string, number>();
  for (const row of proposalRows.data ?? []) {
    pendingProposalByType.set(row.field_type_id, (pendingProposalByType.get(row.field_type_id) ?? 0) + 1);
  }

  const packs = packsList.map((pack) => ({
    ...pack,
    fieldTypeCount: allTypes.filter((entry) => entry.fieldPackId === pack.id).length,
    pendingReviews: allTypes
      .filter((entry) => entry.fieldPackId === pack.id)
      .reduce((acc, entry) => acc + (pendingReviewByType.get(entry.id) ?? 0), 0),
    pendingProposals: allTypes
      .filter((entry) => entry.fieldPackId === pack.id)
      .reduce((acc, entry) => acc + (pendingProposalByType.get(entry.id) ?? 0), 0),
    lastIngestAt: lastIngestByPack.get(pack.id) ?? null,
  }));
  const packsWithHealth = packs.map((pack) => {
    const pressure = Math.min(pack.pendingReviews + pack.pendingProposals, 20);
    const healthScore = Math.max(0, 100 - pressure * 5);
    return { ...pack, healthScore };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field packs"
        description="Packs group related field types and normalization rules."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="tonal" size="sm" className="rounded-full">
              <Link href="/dashboard/reviews">Review queue</Link>
            </Button>
            <Button asChild variant="soft" size="sm" className="rounded-full">
              <Link href="/dashboard/imports">View imports</Link>
            </Button>
          </div>
        }
      />

      <Reveal>
        <DataToolbar
        placeholder="Search packs (UI scaffold)"
        rightSlot={
          <>
            <span className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground">
              {packs.length} packs
            </span>
            <span className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground">
              avg health{" "}
              {Math.round(
                packsWithHealth.reduce((acc, pack) => acc + pack.healthScore, 0) / Math.max(packsWithHealth.length, 1),
              )}
              %
            </span>
          </>
        }
      />
      </Reveal>

      {packs.length === 0 ? (
        <Reveal>
          <EmptyState
          title="No packs available"
          description="Seed or import packs to see them listed here."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/imports">Go to imports</Link>
            </Button>
          }
        />
        </Reveal>
      ) : (
        <Reveal delay={0.08}>
          <PacksExpandableTable
            packs={packsWithHealth.map((pack) => ({
              id: pack.id,
              key: pack.key,
              name: pack.name,
              category: pack.category,
              status: pack.status,
              version: pack.version,
              fieldTypeCount: pack.fieldTypeCount,
              pendingReviews: pack.pendingReviews,
              pendingProposals: pack.pendingProposals,
              healthScore: pack.healthScore,
              lastIngestAt: pack.lastIngestAt,
            }))}
            statusVariant={statusVariant}
          />
        </Reveal>
      )}
    </div>
  );
}

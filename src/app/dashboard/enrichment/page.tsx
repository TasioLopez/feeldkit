import type { Metadata } from "next";
import { EnrichmentClient } from "./enrichment-client";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminActorContext } from "@/lib/auth/admin-context";
import { listEnrichmentJobs } from "@/lib/enrichment/job-service";

export const metadata: Metadata = {
  title: "AI Enricher | FeeldKit",
  description: "Generate AI enrichment proposals from dashboard.",
};

export default async function DashboardEnrichmentPage() {
  const actor = await getAdminActorContext();
  const repo = getFieldRepository();
  const [packs, fieldTypes] = await Promise.all([repo.getPacks(), repo.getFieldTypes()]);
  const jobs = actor?.organizationId ? await listEnrichmentJobs(actor.organizationId, 30) : [];
  const packKeyById = new Map(packs.map((pack) => [pack.id, pack.key]));
  const options = fieldTypes.map((fieldType) => ({
    key: fieldType.key,
    name: fieldType.name,
    packKey: packKeyById.get(fieldType.fieldPackId) ?? "unknown",
  }));
  if (options.length === 0) {
    return <EmptyState title="No field types available" description="Import packs before using AI enrichment." />;
  }
  return <EnrichmentClient fieldTypes={options} initialJobs={jobs} />;
}

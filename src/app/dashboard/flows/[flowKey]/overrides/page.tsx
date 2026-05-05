import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminActorContext } from "@/lib/auth/admin-context";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";
import { getGovernanceRepository } from "@/lib/governance/get-governance-repository";

export const metadata: Metadata = {
  title: "Flow overrides | FeeldKit",
};

export default async function FlowOverridesPage({ params }: { params: Promise<{ flowKey: string }> }) {
  const { flowKey } = await params;
  const repo = getFlowRepository();
  const flow = await repo.getFlowByKey(flowKey);
  if (!flow) notFound();

  const active = await repo.getFlowVersion(flowKey);
  const actor = await getAdminActorContext();
  const governance = getGovernanceRepository();
  const existing =
    actor?.organizationId != null ? await governance.listFlowPackOverrides(actor.organizationId, flow.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Overrides · ${flow.name}`}
        description="Mapping-level overrides are managed via API keys with admin:flows (PUT /api/v1/admin/governance/flow-overrides). This page lists current rows for your signed-in organization."
        actions={
          <Link href={`/dashboard/flows/${encodeURIComponent(flowKey)}`} className="text-sm underline-offset-4 hover:underline">
            Back to flow
          </Link>
        }
      />

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Active baseline mappings</CardTitle>
          <CardDescription>Ordinals reference skip/replace/lock targets.</CardDescription>
        </CardHeader>
        <div className="border-t border-stroke-soft px-6 py-4">
          {!active ? (
            <p className="text-sm text-muted-foreground">No active version loaded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.ordinal}</TableCell>
                    <TableCell className="text-xs">{m.kind}</TableCell>
                    <TableCell className="font-mono text-xs">{m.sourceFieldKey}</TableCell>
                    <TableCell className="font-mono text-xs">{m.targetFieldKey}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <Card variant="panel">
        <CardHeader>
          <CardTitle className="text-base">Org overrides ({existing.length})</CardTitle>
          <CardDescription>
            Pin a version via <code className="font-mono text-[11px]">pin_version</code> +{" "}
            <code className="font-mono text-[11px]">flow_pack_version_id</code>.
          </CardDescription>
        </CardHeader>
        <div className="border-t border-stroke-soft px-6 py-4">
          {existing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overrides yet.</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {existing.map((row) => (
                <li key={row.id}>
                  ordinal {row.ordinal ?? "—"} · {row.action} · version {row.flowPackVersionId ?? "default-active"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

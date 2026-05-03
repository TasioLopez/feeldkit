import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { listIndustryEdges, listIndustryEdgesWithContext } from "@/lib/industry/concept-service";
import { decideIndustryEdgeAction } from "./actions";

export const metadata: Metadata = {
  title: "Industry Ops | FeeldKit",
  description: "Review and manage industry interoperability graph.",
};

export default async function DashboardIndustryPage() {
  const admin = getSupabaseServiceClient();
  const pendingEdges = await listIndustryEdgesWithContext("pending");
  const approvedEdges = await listIndustryEdges("approved");
  const { data: codeRows } = admin
    ? await admin
        .from("industry_concept_codes")
        .select("code_system, id")
        .limit(5000)
    : { data: [] as Array<{ code_system: string; id: string }> };
  const countsBySystem = new Map<string, number>();
  for (const row of codeRows ?? []) {
    countsBySystem.set(row.code_system, (countsBySystem.get(row.code_system) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industry interoperability"
        description="Manage cross-system industry mappings and inferred edges."
        actions={
          <Button asChild size="sm" variant="soft" className="rounded-full">
            <a href="/dashboard/reviews?status=pending">Open review queue</a>
          </Button>
        }
      />

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Coverage by code system</CardTitle>
          <CardDescription>Current imported code counts per taxonomy source.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[...countsBySystem.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([system, count]) => (
              <Badge key={system} variant="secondary">
                {system}: {count}
              </Badge>
            ))}
        </CardContent>
      </Card>

      <Card variant="panel">
        <CardHeader>
          <CardTitle className="text-base">Mapping edge status</CardTitle>
          <CardDescription>Track approved and pending graph mappings.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="success">approved {approvedEdges.length}</Badge>
          <Badge variant="warning">pending {pendingEdges.length}</Badge>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Pending inferred edges</h2>
        {pendingEdges.length === 0 ? (
          <Card variant="panel">
            <CardHeader>
              <CardTitle className="text-base">No pending edges</CardTitle>
              <CardDescription>All inferred industry mappings are already triaged.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          pendingEdges.map((edge) => (
            <Card key={edge.id} variant="elevated">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {edge.fromConceptLabel}
                    <span className="mx-1.5 font-normal text-muted-foreground">→</span>
                    {edge.toConceptLabel}
                  </CardTitle>
                  <Badge variant="warning">{edge.mappingQuality}</Badge>
                </div>
                <CardDescription className="space-y-1">
                  <span>
                    Relation: {edge.relationType} · {Math.round(edge.confidence * 100)}% confidence · source:{" "}
                    {edge.source ?? "unknown"}
                    {edge.inferred ? " · inferred" : ""}
                  </span>
                  {edge.fromCodesSummary ? (
                    <span className="block font-mono text-xs text-muted-foreground">From codes: {edge.fromCodesSummary}</span>
                  ) : null}
                  {edge.toCodesSummary ? (
                    <span className="block font-mono text-xs text-muted-foreground">To codes: {edge.toCodesSummary}</span>
                  ) : null}
                  {edge.sourceEvidence ? (
                    <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
                      {edge.sourceEvidence}
                    </pre>
                  ) : null}
                  <span className="block font-mono text-[10px] text-muted-foreground/80">Edge id: {edge.id}</span>
                </CardDescription>
                <div className="mt-3 flex gap-2">
                  <form action={decideIndustryEdgeAction.bind(null, edge.id, "approved")}>
                    <Button type="submit" size="sm" variant="brand">
                      Approve
                    </Button>
                  </form>
                  <form action={decideIndustryEdgeAction.bind(null, edge.id, "rejected")}>
                    <Button type="submit" size="sm" variant="soft">
                      Reject
                    </Button>
                  </form>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

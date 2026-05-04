import Link from "next/link";
import type { Metadata } from "next";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";

export const metadata: Metadata = {
  title: "Flow packs | FeeldKit",
  description: "Deterministic source -> target flow mappings (Phase 3).",
};

export default async function DashboardFlowsPage() {
  const repo = getFlowRepository();
  const flows = await repo.listFlows();
  const summaries = await Promise.all(
    flows.map(async (flow) => {
      const active = await repo.getFlowVersion(flow.key);
      const totalMappings = active?.mappings.length ?? 0;
      const translateMappings = active?.mappings.filter((mapping) => mapping.kind === "translate").length ?? 0;
      const directMappings = totalMappings - translateMappings;
      return {
        ...flow,
        activeVersion: active?.version.version ?? null,
        totalMappings,
        directMappings,
        translateMappings,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flow packs"
        description="Deterministic, versioned source-to-target field mappings. Crosswalks auto-apply; ambiguous values fall back to the review queue."
      />

      <Reveal>
        <DataToolbar
          placeholder="Search flow packs (filter coming soon)"
          rightSlot={
            <span className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground">
              {summaries.length} flows
            </span>
          }
        />
      </Reveal>

      {summaries.length === 0 ? (
        <Reveal>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base">No flow packs yet</CardTitle>
              <CardDescription>
                Author a JSON file under <code className="rounded bg-muted px-1 py-0.5 text-xs">src/data/flows/</code>{" "}
                and run <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run flows:ingest</code> to register
                it here.
              </CardDescription>
            </CardHeader>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.06}>
          <Card variant="elevated" className="overflow-hidden p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flow</TableHead>
                    <TableHead>Source -&gt; Target</TableHead>
                    <TableHead>Active version</TableHead>
                    <TableHead className="text-right">Direct</TableHead>
                    <TableHead className="text-right">Translate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/flows/${entry.key}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {entry.name}
                        </Link>
                        <div className="font-mono text-xs text-muted-foreground">{entry.key}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.sourceSystem} <span className="mx-1 text-stroke-strong">-&gt;</span>{" "}
                        {entry.targetSystem}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.activeVersion ? (
                          <Badge variant="secondary">{entry.activeVersion}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{entry.directMappings}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{entry.translateMappings}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{entry.totalMappings}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  );
}

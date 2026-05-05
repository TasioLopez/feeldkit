import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";
import { Button } from "@/components/ui/button";
import { FlowTestForm } from "./flow-test-form";
import { rollbackFlowFormAction, retireFlowFormAction } from "./actions";

export const metadata: Metadata = {
  title: "Flow detail | FeeldKit",
};

type RouteParams = { flowKey: string };

export default async function DashboardFlowDetailPage({ params }: { params: Promise<RouteParams> }) {
  const { flowKey } = await params;
  const repo = getFlowRepository();
  const flow = await repo.getFlowByKey(flowKey);
  if (!flow) {
    notFound();
  }
  const versions = await repo.listVersions(flowKey);
  const active = await repo.getFlowVersion(flowKey);

  return (
    <div className="space-y-6">
      <PageHeader
        title={flow.name}
        description={flow.description || `${flow.sourceSystem} -> ${flow.targetSystem}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/dashboard/flows/${encodeURIComponent(flowKey)}/overrides`}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Overrides
            </Link>
            <Link
              href="/dashboard/flows"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Back to flows
            </Link>
          </div>
        }
      />

      <Reveal delay={0.02}>
        <Card variant="panel">
          <CardHeader>
            <CardTitle className="text-base">Rollback active version</CardTitle>
            <CardDescription>Promotes a prior semver to active (service-role). Audit-logged.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <form action={rollbackFlowFormAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="flow_key" value={flowKey} />
              <label className="text-xs text-muted-foreground">
                Target semver
                <input
                  name="target_version"
                  placeholder="1.0.0"
                  className="mt-1 block rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
                  required
                />
              </label>
              <Button type="submit" size="sm" variant="brand">
                Roll back
              </Button>
            </form>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base">Versions</CardTitle>
            <CardDescription>
              Each <code className="rounded bg-muted px-1 py-0.5 text-xs">version</code> in the JSON file is immutable;
              re-running <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run flows:ingest</code> with a
              bumped semver creates a new row and demotes prior ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Changelog</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      No versions yet — run the ingest script.
                    </TableCell>
                  </TableRow>
                ) : (
                  versions.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell className="font-mono text-sm">{version.version}</TableCell>
                      <TableCell>
                        {version.isActive ? (
                          <Badge variant="success">active</Badge>
                        ) : (
                          <Badge variant="muted">inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{version.lifecycle}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{version.changelog ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(version.createdAt))}
                      </TableCell>
                      <TableCell className="text-right">
                        {version.lifecycle !== "retired" ? (
                          <form action={retireFlowFormAction} className="inline">
                            <input type="hidden" name="flow_key" value={flowKey} />
                            <input type="hidden" name="version" value={version.version} />
                            <Button type="submit" size="sm" variant="outline">
                              Retire
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.06}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base">
              Field mappings{" "}
              {active ? (
                <span className="font-mono text-xs text-muted-foreground">v{active.version.version}</span>
              ) : null}
            </CardTitle>
            <CardDescription>
              <span className="font-medium">direct</span> rules transform the source value locally.{" "}
              <span className="font-medium">translate</span> rules go through{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">translateOne</code> with{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">require_deterministic</code> in V1.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Source key</TableHead>
                  <TableHead>Target key</TableHead>
                  <TableHead>Transform / options</TableHead>
                  <TableHead>Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active?.mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">{mapping.ordinal}</TableCell>
                    <TableCell>
                      <Badge variant={mapping.kind === "translate" ? "brand" : "muted"}>{mapping.kind}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{mapping.sourceFieldKey}</TableCell>
                    <TableCell className="font-mono text-xs">{mapping.targetFieldKey}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {mapping.kind === "direct"
                        ? JSON.stringify(mapping.transform)
                        : JSON.stringify(mapping.options)}
                    </TableCell>
                    <TableCell>
                      {mapping.isRequired ? (
                        <Badge variant="warning">required</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">optional</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.12}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base">Test this flow</CardTitle>
            <CardDescription>
              Calls <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/v1/flow/translate</code> using your
              session. JSON in, JSON out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FlowTestForm flowKey={flow.key} />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

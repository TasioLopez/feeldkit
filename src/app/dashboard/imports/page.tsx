import type { Metadata } from "next";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Imports | FeeldKit",
  description: "Reference data sources and import status.",
};

type ImportSourceRow = {
  key: string;
  name: string;
  version: string | null;
  retrieved_at: string | null;
  url: string | null;
};

export default async function DashboardImportsPage() {
  const admin = getSupabaseServiceClient();
  const { data: rows } = admin
    ? await admin
        .from("import_sources")
        .select("key, name, version, retrieved_at, url")
        .order("retrieved_at", { ascending: false, nullsFirst: false })
    : { data: [] as ImportSourceRow[] | null };

  const sources = (rows ?? []) as ImportSourceRow[];

  return (
    <div className="space-y-6">
      <PageHeader title="Imports" description="Reference datasets recorded when packs and graphs are ingested." />
      <Reveal>
        <DataToolbar
          placeholder="Search import sources (filter coming soon)"
          rightSlot={
            <span className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground">
              {sources.length} sources
            </span>
          }
        />
      </Reveal>
      <Reveal delay={0.06}>
        {sources.length === 0 ? (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base">No import sources yet</CardTitle>
              <CardDescription>
                Run a full import to populate this list, for example{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run import:full-v1</code> or{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run seed</code>.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card variant="elevated" className="overflow-hidden p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Retrieved</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{entry.key}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{entry.version ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.retrieved_at
                          ? new Intl.DateTimeFormat(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(entry.retrieved_at))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.url ? (
                          <a
                            href={entry.url}
                            className="text-primary underline-offset-4 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Reveal>
    </div>
  );
}

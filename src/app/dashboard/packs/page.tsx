import Link from "next/link";
import type { Metadata } from "next";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/dashboard/page-header";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const packsList = await repo.getPacks();
  const allTypes = await repo.getFieldTypes();
  const packs = packsList.map((pack) => ({
    ...pack,
    fieldTypeCount: allTypes.filter((entry) => entry.fieldPackId === pack.id).length,
  }));

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
          <Card variant="elevated" className="overflow-hidden p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Field types</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packs.map((pack) => (
                  <TableRow key={pack.id}>
                    <TableCell>
                      <Link href={`/dashboard/packs/${pack.key}`} className="font-medium text-primary hover:underline">
                        {pack.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{pack.category}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(pack.status)}>{pack.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{pack.version}</TableCell>
                    <TableCell className="text-right tabular-nums">{pack.fieldTypeCount}</TableCell>
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

import Link from "next/link";
import type { Metadata } from "next";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Field packs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Packs group related field types and normalization rules.</p>
      </div>
      {packs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No packs</CardTitle>
            <CardDescription>Seed or import packs to see them listed here.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
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
      )}
    </div>
  );
}

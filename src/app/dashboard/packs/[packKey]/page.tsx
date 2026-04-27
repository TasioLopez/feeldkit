import Link from "next/link";
import type { Metadata } from "next";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";

interface Props {
  params: Promise<{ packKey: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { packKey } = await params;
  const repo = getFieldRepository();
  const pack = await repo.getPackByKey(packKey);
  return {
    title: pack ? `${pack.name} | FeeldKit` : "Pack | FeeldKit",
    description: pack?.description ?? "Field pack details",
  };
}

function statusVariant(status: string): "default" | "secondary" | "success" | "warning" | "muted" {
  const s = status.toLowerCase();
  if (s === "active" || s === "published" || s === "ready") return "success";
  if (s === "draft" || s === "beta") return "warning";
  if (s === "deprecated") return "muted";
  return "secondary";
}

export default async function DashboardPackDetailPage({ params }: Props) {
  const { packKey } = await params;
  const repo = getFieldRepository();
  const pack = await repo.getPackByKey(packKey);
  if (!pack) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Overview", href: "/dashboard" }, { label: "Packs", href: "/dashboard/packs" }, { label: "Not found" }]} />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Pack not found</CardTitle>
            <CardDescription>No pack matches this key. Check the URL or return to the pack list.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/packs">Back to packs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fieldTypes = (await repo.getFieldTypes()).filter((entry) => entry.fieldPackId === pack.id);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Overview", href: "/dashboard" },
          { label: "Packs", href: "/dashboard/packs" },
          { label: pack.name },
        ]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{pack.name}</h1>
            <Badge variant={statusVariant(pack.status)}>{pack.status}</Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {pack.version}
            </Badge>
          </div>
          <p className="max-w-2xl text-muted-foreground leading-relaxed">{pack.description}</p>
        </div>
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Package className="size-7" aria-hidden />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Version</CardTitle>
            <CardDescription>Current pack revision</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-lg font-medium">{pack.version}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Field types</CardTitle>
            <CardDescription>{fieldTypes.length} type{fieldTypes.length === 1 ? "" : "s"} in this pack</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            {fieldTypes.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No field types linked to this pack.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="font-mono text-xs">Key</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fieldTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <Link href={`/dashboard/field-types/${type.key}`} className="font-medium text-primary hover:underline">
                          {type.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{type.key}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

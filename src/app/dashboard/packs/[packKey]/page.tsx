import Link from "next/link";
import type { Metadata } from "next";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionPanel } from "@/components/dashboard/section-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
        <EmptyState
          title="Pack not found"
          description="No pack matches this key. Check the URL or return to the pack list."
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard/packs">Back to packs</Link>
            </Button>
          }
        />
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
      <PageHeader
        title={pack.name}
        description={pack.description}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(pack.status)}>{pack.status}</Badge>
            <Badge variant="outline" className="font-mono text-[11px]">
              {pack.version}
            </Badge>
          </div>
        }
      />

      <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-3 text-brand-strong">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Package className="size-4" />
          Package metadata snapshot
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionPanel title="Version" description="Current pack revision">
          <CardContent>
            <p className="font-mono text-lg font-medium">{pack.version}</p>
          </CardContent>
        </SectionPanel>
        <SectionPanel
          title="Field types"
          description={`${fieldTypes.length} type${fieldTypes.length === 1 ? "" : "s"} in this pack`}
        >
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
        </SectionPanel>
      </div>
    </div>
  );
}

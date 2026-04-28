import type { Metadata } from "next";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionPanel } from "@/components/dashboard/section-panel";
import { CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Layers } from "lucide-react";

interface Props {
  params: Promise<{ fieldKey: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fieldKey } = await params;
  const repo = getFieldRepository();
  const type = await repo.getFieldTypeByKey(fieldKey);
  return {
    title: type ? `${type.name} | FeeldKit` : "Field type | FeeldKit",
    description: type ? `Values and aliases for ${type.name}` : "Field type details",
  };
}

export default async function FieldTypeDetailPage({ params }: Props) {
  const { fieldKey } = await params;
  const repo = getFieldRepository();
  const type = await repo.getFieldTypeByKey(fieldKey);
  if (!type) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Overview", href: "/dashboard" }, { label: "Packs", href: "/dashboard/packs" }, { label: "Not found" }]} />
        <EmptyState title="Field type not found" description="No field type matches this key." />
      </div>
    );
  }
  const values = await repo.getValuesByFieldKey(fieldKey);
  const aliases = await repo.getAliasesForType(type.id);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Overview", href: "/dashboard" },
          { label: "Packs", href: "/dashboard/packs" },
          { label: type.name },
        ]}
      />
      <PageHeader
        title={type.name}
        description={`${type.key} · ${values.length} values · ${aliases.length} aliases`}
        actions={
          <div className="flex size-10 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/60 text-brand-strong">
            <Layers className="size-5" aria-hidden />
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="Values" description="Canonical labels and keys">
          <CardContent className="flex-1 overflow-hidden p-0 px-6 pb-6">
            <ul className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm">
              {values.map((value) => (
                <li key={value.id} className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-foreground">{value.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">({value.key})</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </SectionPanel>
        <SectionPanel title="Aliases" description="Alternate strings and confidence">
          <CardContent className="flex-1 overflow-hidden p-0 px-6 pb-6">
            <ul className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm">
              {aliases.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-2">
                  <span className="text-foreground">{entry.alias}</span>
                  <span className="font-mono text-xs text-muted-foreground">({entry.confidence})</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </SectionPanel>
      </div>
    </div>
  );
}

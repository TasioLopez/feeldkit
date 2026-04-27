import type { Metadata } from "next";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Field type not found</CardTitle>
            <CardDescription>No field type matches this key.</CardDescription>
          </CardHeader>
        </Card>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{type.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {type.key} · {values.length} values · {aliases.length} aliases
          </p>
        </div>
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Layers className="size-7" aria-hidden />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Values</CardTitle>
            <CardDescription>Canonical labels and keys</CardDescription>
          </CardHeader>
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
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Aliases</CardTitle>
            <CardDescription>Alternate strings and confidence</CardDescription>
          </CardHeader>
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
        </Card>
      </div>
    </div>
  );
}

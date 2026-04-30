"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PackRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  status: string;
  version: string;
  fieldTypeCount: number;
  healthScore: number;
  pendingProposals: number;
  pendingReviews: number;
  lastIngestAt: string | null;
};

type PackFieldTypeData = {
  id: string;
  key: string;
  name: string;
  totalValues: number;
  canonicalRef?: { pack_key: string; field_type_key: string; relationship: string } | null;
  previewValues: Array<{ id: string; key: string; label: string }>;
};

type Props = {
  packs: PackRow[];
};

function statusVariant(status: string): "default" | "secondary" | "success" | "warning" | "muted" {
  const s = status.toLowerCase();
  if (s === "active" || s === "published" || s === "ready") return "success";
  if (s === "draft" || s === "beta") return "warning";
  if (s === "deprecated") return "muted";
  return "secondary";
}

export function PacksExpandableTable({ packs }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, PackFieldTypeData[]>>({});

  async function togglePack(packKey: string) {
    const next = !expanded[packKey];
    setExpanded((current) => ({ ...current, [packKey]: next }));
    if (!next || details[packKey] || loading[packKey]) {
      return;
    }
    setLoading((current) => ({ ...current, [packKey]: true }));
    try {
      const res = await fetch(`/dashboard/packs/data?packKey=${encodeURIComponent(packKey)}`);
      if (!res.ok) {
        setDetails((current) => ({ ...current, [packKey]: [] }));
        return;
      }
      const payload = (await res.json()) as { fieldTypes?: PackFieldTypeData[] };
      setDetails((current) => ({ ...current, [packKey]: payload.fieldTypes ?? [] }));
    } finally {
      setLoading((current) => ({ ...current, [packKey]: false }));
    }
  }

  return (
    <Card variant="elevated" className="overflow-hidden p-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Pack</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead className="text-right">Field types</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packs.map((pack) => (
              <Fragment key={pack.id}>
                <TableRow>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => void togglePack(pack.key)}
                      aria-label={expanded[pack.key] ? `Collapse ${pack.name}` : `Expand ${pack.name}`}
                    >
                      {expanded[pack.key] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </Button>
                  </TableCell>
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
                  <TableCell>
                    <Badge variant={pack.healthScore >= 80 ? "success" : pack.healthScore >= 50 ? "warning" : "destructive"}>
                      {pack.healthScore}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="secondary">reviews {pack.pendingReviews}</Badge>
                      <Badge variant="secondary">proposals {pack.pendingProposals}</Badge>
                      <Link href={`/dashboard/reviews?q=${encodeURIComponent(pack.key)}&status=pending`} className="text-primary hover:underline">
                        triage
                      </Link>
                    </div>
                    {pack.lastIngestAt ? <div className="mt-1">last ingest {new Date(pack.lastIngestAt).toLocaleDateString()}</div> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pack.fieldTypeCount}</TableCell>
                </TableRow>
                {expanded[pack.key] ? (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-muted/30">
                      {loading[pack.key] ? (
                        <p className="px-2 py-2 text-sm text-muted-foreground">Loading field types and values…</p>
                      ) : (
                        <div className="space-y-3 px-2 py-2">
                          {(details[pack.key] ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No field types available.</p>
                          ) : (
                            (details[pack.key] ?? []).map((type) => (
                              <div key={type.id} className="rounded-lg border border-border bg-background px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Link href={`/dashboard/field-types/${type.key}`} className="font-medium text-primary hover:underline">
                                      {type.name}
                                    </Link>
                                    {type.canonicalRef ? (
                                      <Badge variant="outline" className="font-mono text-[10px]">
                                        ref {type.canonicalRef.pack_key}.{type.canonicalRef.field_type_key}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{type.totalValues} values</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {type.previewValues.map((value) => (
                                    <Badge key={value.id} variant="secondary" className="max-w-full truncate">
                                      {value.label}
                                    </Badge>
                                  ))}
                                  {type.totalValues > type.previewValues.length ? (
                                    <Badge variant="muted">+{type.totalValues - type.previewValues.length} more</Badge>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

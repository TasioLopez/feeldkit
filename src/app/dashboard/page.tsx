import Link from "next/link";
import type { Metadata } from "next";
import { Activity, Boxes, Database, KeyRound, ListTodo, Sparkles, TrendingUp } from "lucide-react";
import { MetricTile } from "@/components/dashboard/metric-tile";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { listReviewQueue } from "@/lib/matching/review-queue";
import { getMemoryUsageEvents } from "@/lib/telemetry/usage-events";

export const metadata: Metadata = {
  title: "Overview | FeeldKit",
  description: "Dashboard overview for packs, field types, and usage.",
};

export default async function DashboardPage() {
  const repo = getFieldRepository();
  const packs = (await repo.getPacks()).length;
  const fieldTypes = (await repo.getFieldTypes()).length;
  const types = await repo.getFieldTypes();
  let values = 0;
  for (const type of types) {
    values += (await repo.getValuesByFieldKey(type.key)).length;
  }
  const pendingReviews = listReviewQueue().length;
  const usage = getMemoryUsageEvents().length;

  const cards = [
    {
      label: "Field packs",
      value: packs,
      description: "Installed normalization packs",
      href: "/dashboard/packs",
      icon: Boxes,
    },
    {
      label: "Field types",
      value: fieldTypes,
      description: "Distinct field definitions",
      href: "/dashboard/packs",
      icon: Database,
    },
    {
      label: "Values",
      value: values,
      description: "Canonical values across types",
      href: "/dashboard/packs",
      icon: Activity,
    },
    {
      label: "Pending reviews",
      value: pendingReviews,
      description: "Low-confidence items to triage",
      href: "/dashboard/reviews",
      icon: ListTodo,
    },
    {
      label: "API usage (memory)",
      value: usage,
      description: "Events recorded in this process",
      href: "/dashboard/api-keys",
      icon: KeyRound,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Key metrics and quick actions for your FeeldKit workspace."
        actions={
          <Button asChild variant="brand" size="sm" className="rounded-full">
            <Link href="/dashboard/packs">Manage packs</Link>
          </Button>
        }
      />

      <Card variant="feature" className="overflow-hidden">
        <CardHeader className="relative">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft/60 px-3 py-1 text-xs font-medium text-brand-strong">
              <Sparkles className="size-3.5" />
              Intelligence status
            </div>
            <CardTitle className="text-2xl tracking-tight">Data quality, normalized</CardTitle>
            <CardDescription className="max-w-2xl">
              Monitor packs, values, and review pressure in one place. Drill down to improve match quality where it matters.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <MetricTile
              key={card.label}
              title={card.label}
              value={card.value}
              description={card.description}
              href={card.href}
              icon={card.icon}
            />
          ))}
        </div>
        <Card variant="panel" className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quality pulse</CardTitle>
              <TrendingUp className="size-4 text-brand-strong" />
            </div>
            <CardDescription>High-level indicators for ongoing maintenance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Review pressure", value: pendingReviews === 0 ? "Low" : "Medium", variant: pendingReviews === 0 ? "success" : "warning" },
              { label: "Coverage health", value: fieldTypes > 0 ? "Good" : "Needs setup", variant: fieldTypes > 0 ? "success" : "warning" },
              { label: "Usage activity", value: usage > 0 ? "Active" : "Idle", variant: usage > 0 ? "brand" : "muted" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-lg border border-stroke-soft bg-surface-panel px-3 py-2">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <Badge variant={row.variant as "success" | "warning" | "brand" | "muted"}>{row.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Recommended next actions</CardTitle>
          <CardDescription>Keep normalization quality high with a quick weekly routine.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Review low-confidence entries", href: "/dashboard/reviews" },
            { label: "Audit pack coverage and versions", href: "/dashboard/packs" },
            { label: "Rotate old API keys", href: "/dashboard/api-keys" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

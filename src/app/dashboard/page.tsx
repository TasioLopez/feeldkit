import Link from "next/link";
import type { Metadata } from "next";
import { Activity, Boxes, Database, KeyRound, ListTodo } from "lucide-react";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { listReviewQueue } from "@/lib/matching/review-queue";
import { getMemoryUsageEvents } from "@/lib/telemetry/usage-events";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Key metrics for your FeeldKit workspace.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <Card className="h-full border-border/80 transition-shadow group-hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                    <span className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                  </div>
                  <p className="text-3xl font-semibold tabular-nums text-foreground">{card.value}</p>
                  <CardDescription className="text-xs leading-relaxed">{card.description}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <span className="text-xs font-medium text-primary group-hover:underline">View details</span>
                </CardFooter>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

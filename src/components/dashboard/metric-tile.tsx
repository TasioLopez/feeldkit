import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricTile({
  title,
  value,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card variant="feature" className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <span className="flex size-9 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/60 text-brand-strong">
              <Icon className="size-4" />
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter className="pt-0">
          <span className="text-xs font-medium text-brand-strong transition group-hover:underline">Open</span>
        </CardFooter>
      </Card>
    </Link>
  );
}

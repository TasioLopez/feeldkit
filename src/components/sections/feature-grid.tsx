import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function FeatureGrid({ items }: { items: Feature[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title} variant="feature" className="h-full">
            <CardHeader>
              <div className="flex size-11 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft/60 text-brand-strong">
                <Icon className="size-5" />
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </section>
  );
}

import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function FeatureGrid({ items }: { items: Feature[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-6">
      {items.map((item, index) => {
        const Icon = item.icon;
        const span = index === 0 ? "md:col-span-3" : index === 3 ? "md:col-span-3" : "md:col-span-3 lg:col-span-2";
        return (
          <Card key={item.title} variant="feature" className={`hover-lift h-full ${span}`}>
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

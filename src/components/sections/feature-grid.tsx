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
        const span = index === 0 ? "md:col-span-4 lg:col-span-3" : index === 3 ? "md:col-span-4 lg:col-span-3" : "md:col-span-2 lg:col-span-3";
        const isVisualTile = index === 0;
        return (
          <div key={item.title} className={span}>
            <Card variant="feature" className="hover-lift h-full overflow-hidden">
              {isVisualTile ? (
                <div className="border-b border-brand/15 bg-gradient-to-r from-brand-soft/55 via-brand/10 to-transparent p-4">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs text-muted-foreground">
                    <span className="pulse-soft">
                      `usa`
                    </span>
                    <span className="pulse-soft h-px w-12 bg-brand/60" />
                    <span className="pulse-soft">
                      `United States`
                    </span>
                  </div>
                </div>
              ) : null}
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft/60 text-brand-strong">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        );
      })}
    </section>
  );
}

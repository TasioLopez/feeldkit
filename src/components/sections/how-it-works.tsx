import { ArrowRight, Database, Sparkles, Workflow } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "Ingest messy values",
    description: "Collect raw values from forms, imports, enrichment tools, and data syncs.",
    icon: Database,
  },
  {
    title: "Normalize with field intelligence",
    description: "Map aliases, apply crosswalks, and classify values with confidence metadata.",
    icon: Sparkles,
  },
  {
    title: "Ship clean outputs",
    description: "Use canonical values across APIs, automations, and analytics pipelines.",
    icon: Workflow,
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-4">
      <div className="max-w-2xl">
        <h2 className="section-title text-3xl font-semibold text-foreground">How it works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          One reusable field intelligence layer from input chaos to production-quality data.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative">
              <Card variant="panel" className="hover-lift h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex size-11 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/60 text-brand-strong">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">Step {index + 1}</span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
              {index < steps.length - 1 ? (
                <ArrowRight className="pointer-events-none absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 text-brand/65 lg:block" />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

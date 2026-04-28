 "use client";

import { motion } from "framer-motion";
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
    <section className="space-y-5">
      <div className="max-w-2xl">
        <h2 className="section-title text-3xl font-semibold text-foreground">How it works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          One reusable field intelligence layer from input chaos to production-quality data.
        </p>
      </div>
      <div className="relative grid gap-4 lg:grid-cols-3">
        <motion.div
          className="absolute left-0 right-0 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-brand/45 to-transparent lg:block"
          initial={{ scaleX: 0, opacity: 0.2 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              className="relative"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card variant="panel" className="hover-lift h-full overflow-hidden">
                <motion.div
                  className="h-1.5 w-full bg-gradient-to-r from-brand/15 via-brand/65 to-brand/20"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.7, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: "left" }}
                />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <motion.div
                      className="flex size-11 items-center justify-center rounded-lg border border-brand/20 bg-brand-soft/60 text-brand-strong"
                      whileInView={{ scale: [0.94, 1.04, 1] }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.5, delay: index * 0.12 }}
                    >
                      <Icon className="size-5" />
                    </motion.div>
                    <span className="text-xs font-semibold text-muted-foreground">Step {index + 1}</span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
              {index < steps.length - 1 ? (
                <motion.div
                  className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 lg:block"
                  animate={{ x: [0, 5, 0], opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.2 }}
                >
                  <ArrowRight className="size-4 text-brand/65" />
                </motion.div>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

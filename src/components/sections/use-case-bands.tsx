 "use client";

import { motion } from "framer-motion";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const useCases = [
  {
    title: "RevOps & CRM hygiene",
    description:
      "Standardize country, industry, and title data before records land in Salesforce or HubSpot so automation is reliable.",
    accent: "from-brand-soft/60 to-transparent",
  },
  {
    title: "ETL and warehouse quality",
    description:
      "Normalize high-volume batches during ingestion to avoid fragmented dimensions and downstream reporting drift.",
    accent: "from-brand/15 to-transparent",
  },
  {
    title: "Product onboarding and forms",
    description:
      "Parse and validate user-entered values in real time to reduce bad inputs and improve activation funnels.",
    accent: "from-brand-glow/20 to-transparent",
  },
];

export function UseCaseBands() {
  return (
    <section className="space-y-5">
      <div className="max-w-2xl">
        <h2 className="section-title text-3xl font-semibold text-foreground">Built for real production workflows</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          FeeldKit is designed for teams that care about data quality without adding custom field logic in every service.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {useCases.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card variant="elevated" className="hover-lift overflow-hidden">
              <div className={`h-1.5 w-full bg-gradient-to-r ${item.accent}`} />
              <div className="px-6 pt-4">
                <motion.div
                  className="rounded-lg border border-stroke-soft bg-surface-panel/80 p-3"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Raw stream</span>
                    <span>Canonical</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-brand/65"
                      animate={{ width: ["24%", "86%", "24%"] }}
                      transition={{ duration: 3, repeat: Infinity, delay: index * 0.3, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              </div>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

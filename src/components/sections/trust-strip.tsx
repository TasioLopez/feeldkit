"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export function TrustStrip() {
  const items = ["Typed SDK + HTTP API", "Reusable field intelligence", "Built for CRMs, ETL, and RevOps", "Schema packs"];

  return (
    <section className="section-shell rounded-2xl px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="glow">Why teams use FeeldKit</Badge>
          {items.map((item, index) => (
            <motion.span
              key={item}
              className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs font-medium text-muted-foreground"
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
            >
              {item}
            </motion.span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center lg:w-[340px]">
          {[
            { label: "Fields", value: "40+" },
            { label: "Routes", value: "30+" },
            { label: "Packs", value: "10+" },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              className="rounded-lg border border-stroke-soft bg-surface-panel px-2 py-2"
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.55 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
            >
              <p className="text-sm font-semibold text-foreground">{metric.value}</p>
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

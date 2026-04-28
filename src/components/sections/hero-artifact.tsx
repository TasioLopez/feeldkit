"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type Scenario = {
  id: string;
  field: string;
  input: string;
  alias: string;
  output: string;
  confidence: string;
  stepLabel: string;
};

const scenarios: Scenario[] = [
  {
    id: "country",
    field: "countries",
    input: "Netherland",
    alias: "nl",
    output: "Netherlands",
    confidence: "0.94",
    stepLabel: "Alias + canonical mapping",
  },
  {
    id: "industry",
    field: "industry",
    input: "SaaS",
    alias: "software as a service",
    output: "Software",
    confidence: "0.91",
    stepLabel: "Crosswalk enrichment",
  },
  {
    id: "job",
    field: "job_titles",
    input: "Sr SWE",
    alias: "senior software engineer",
    output: "Senior Software Engineer",
    confidence: "0.97",
    stepLabel: "Normalization + confidence scoring",
  },
];

export function HeroArtifact() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const scenario = scenarios[index];

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % scenarios.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-2xl border border-stroke-soft bg-surface-section shadow-xl">
      <div className="noise-overlay absolute inset-0" />
      <div className="artifact-ring absolute inset-0 opacity-80" />

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 540 360" fill="none" aria-hidden>
        <motion.path
          d="M115 102 C 190 102, 205 154, 265 178"
          stroke="color-mix(in oklab, var(--brand) 80%, transparent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0.1, opacity: 0.2 }}
          animate={{ pathLength: 1, opacity: 0.95 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.3, ease: "easeInOut" }}
        />
        <motion.path
          d="M116 186 C 190 186, 205 194, 265 188"
          stroke="color-mix(in oklab, var(--brand) 75%, transparent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0.1, opacity: 0.2 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.3, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.path
          d="M275 182 C 340 176, 362 146, 430 142"
          stroke="color-mix(in oklab, var(--brand) 80%, transparent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0.1, opacity: 0.2 }}
          animate={{ pathLength: 1, opacity: 0.95 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.3, ease: "easeInOut", delay: 0.4 }}
        />
        <motion.path
          d="M275 188 C 342 194, 362 216, 430 220"
          stroke="color-mix(in oklab, var(--brand) 75%, transparent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0.1, opacity: 0.2 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.3, ease: "easeInOut", delay: 0.6 }}
        />
      </svg>

      <motion.div
        className="absolute left-7 top-22 rounded-lg border border-stroke-soft bg-surface-panel/90 px-3 py-2 text-xs font-medium text-foreground shadow-md"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        Raw: {scenario.input}
      </motion.div>
      <motion.div
        className="absolute left-8 top-[11.4rem] rounded-lg border border-stroke-soft bg-surface-panel/90 px-3 py-2 text-xs font-medium text-foreground shadow-md"
        animate={{ y: [0, 3, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        Alias: {scenario.alias}
      </motion.div>

      <div className="absolute left-1/2 top-1/2 w-40 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-brand/25 bg-brand-soft/70 px-3 py-2 text-center shadow-lg">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-strong">Normalize engine</p>
        <p className="mt-1 text-xs text-foreground">{scenario.stepLabel}</p>
      </div>

      <motion.div
        className="absolute right-8 top-[8.4rem] rounded-lg border border-stroke-soft bg-surface-panel/90 px-3 py-2 text-xs font-medium text-foreground shadow-md"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        Canonical: {scenario.output}
      </motion.div>
      <motion.div
        className="absolute right-9 top-[13.5rem] rounded-lg border border-stroke-soft bg-surface-panel/90 px-3 py-2 text-xs font-medium text-foreground shadow-md"
        animate={{ y: [0, 2, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        Confidence: {scenario.confidence}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
          className="absolute bottom-5 left-5 right-5 rounded-xl border border-brand/20 bg-brand-soft/55 p-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-strong">Live transformation</p>
          <pre className="mt-2 overflow-x-auto text-[11px] text-foreground/85">{`field: "${scenario.field}" | "${scenario.input}" -> "${scenario.output}" | confidence: ${scenario.confidence}`}</pre>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

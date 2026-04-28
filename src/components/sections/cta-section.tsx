import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="section-shell premium-surface relative overflow-hidden rounded-2xl px-6 py-10 sm:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">Ready to ship cleaner data?</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Integrate FeeldKit once and reuse field intelligence everywhere.
          </h2>
        </div>
        <Button asChild variant="pill" size="xl">
          <Link href="/docs">
            View API docs
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta?: { href: string; label: string };
  secondaryCta: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card via-card to-subtle px-6 py-14 shadow-lg sm:px-10 sm:py-18">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-80" />
      <div className="premium-surface pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-strong">{eyebrow}</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {title}
          <span className="text-gradient-brand mt-2 block">The field intelligence layer for modern apps.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{subtitle}</p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          {primaryCta ? (
            <Button asChild variant="brand" size="xl">
              <Link href={primaryCta.href}>
                {primaryCta.label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="xl">
            <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroArtifact } from "@/components/sections/hero-artifact";

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
    <section className="section-shell premium-surface relative overflow-hidden rounded-2xl px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-80" />
      <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-3xl">
          <p className="fade-up text-xs font-semibold uppercase tracking-[0.24em] text-brand-strong">{eyebrow}</p>
          <h1 className="display-title fade-up-delay mt-4 text-balance-tight text-4xl font-semibold text-foreground sm:text-5xl md:text-6xl">
            {title}
            <span className="text-gradient-brand mt-2 block">The field intelligence layer for modern apps.</span>
          </h1>
          <p className="fade-up-delay mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{subtitle}</p>
          <div className="fade-up-delay mt-8 flex flex-wrap items-center gap-3">
            {primaryCta ? (
              <Button asChild variant="pill" size="xl">
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
        <div className="fade-up hidden lg:block">
          <HeroArtifact />
        </div>
      </div>
    </section>
  );
}

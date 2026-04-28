import Link from "next/link";
import { Blocks, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingChrome } from "@/components/marketing-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CTASection } from "@/components/sections/cta-section";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { HeroSection } from "@/components/sections/hero-section";
import { TrustStrip } from "@/components/sections/trust-strip";
import { env } from "@/lib/config/env";

export default function Home() {
  const showAdminLink = env.NEXT_PUBLIC_SHOW_ADMIN_LINK === true;

  const features = [
    {
      title: "Normalize",
      description: "Messy inputs become canonical values with confidence and metadata.",
      icon: Sparkles,
    },
    {
      title: "Validate + Parse",
      description: "Field-specific validation rules and parser interfaces stay reusable.",
      icon: ShieldCheck,
    },
    {
      title: "Crosswalk",
      description: "Map values across standards and practical overlays without duplicate logic.",
      icon: GitBranch,
    },
    {
      title: "Composable Packs",
      description: "Ship reusable domain packs for geo, jobs, industry, and custom practical taxonomies.",
      icon: Blocks,
    },
  ];

  return (
    <MarketingChrome>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <HeroSection
          eyebrow="feeldkit.dev"
          title="FeeldKit"
          subtitle="Standardize countries, industries, jobs, company bands, technologies, intent topics, events, and other recurring fields through one reusable API and TypeScript SDK."
          primaryCta={showAdminLink ? { href: "/dashboard", label: "Open dashboard" } : undefined}
          secondaryCta={{ href: "/docs", label: "API documentation" }}
        />

        <TrustStrip />

        <section className="space-y-4">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Build cleaner pipelines with one field layer</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Replace duplicated field parsing logic across forms, imports, ETL jobs, and enrichment flows.
            </p>
          </div>
          <FeatureGrid items={features} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Developer-first",
              desc: "Typed SDK, predictable responses, and canonical metadata for trustworthy automation.",
            },
            {
              title: "Ops-friendly",
              desc: "Review queues and alias enrichment workflows keep quality improving over time.",
            },
            {
              title: "Production-ready",
              desc: "Pack-based architecture keeps normalization logic reusable between teams and products.",
            },
          ].map((item) => (
            <Card key={item.title} variant="elevated">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="link" className="px-0 text-brand-strong">
                  <Link href="/docs">See details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <CTASection />
      </main>
    </MarketingChrome>
  );
}

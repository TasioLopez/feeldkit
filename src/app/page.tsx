import Link from "next/link";
import { ArrowRight, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingChrome } from "@/components/marketing-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ];

  return (
    <MarketingChrome>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">feeldkit.dev</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          FeeldKit
          <span className="mt-2 block text-primary">The field intelligence layer for modern apps.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
          Standardize countries, industries, jobs, company bands, technologies, intent topics, events, and other recurring fields
          through one reusable API and TypeScript SDK.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {showAdminLink ? (
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="lg">
            <Link href="/docs">API documentation</Link>
          </Button>
        </div>
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-border/80 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </MarketingChrome>
  );
}

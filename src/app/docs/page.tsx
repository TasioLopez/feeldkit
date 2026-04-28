import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Braces, FileText, KeyRound, Route } from "lucide-react";
import { MarketingChrome } from "@/components/marketing-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "API documentation | FeeldKit",
  description: "Integrate FeeldKit field intelligence over HTTP with API keys.",
};

export default function PublicDocsPage() {
  const clusters = [
    {
      label: "Discovery",
      routes: ["GET /api/v1/packs", "GET /api/v1/field-types", "GET /api/v1/packs/{packKey}"],
    },
    {
      label: "Normalization",
      routes: ["POST /api/v1/normalize", "POST /api/v1/normalize/batch", "GET /api/v1/crosswalk"],
    },
    {
      label: "Validation & Parse",
      routes: ["POST /api/v1/validate", "POST /api/v1/parse", "POST /api/v1/suggest"],
    },
  ];

  return (
    <MarketingChrome>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="space-y-4 lg:sticky lg:top-22 lg:self-start">
          <Card variant="feature">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg border border-brand/25 bg-brand-soft/60 text-brand-strong">
                <FileText className="size-5" />
              </div>
              <CardTitle className="text-base">Start here</CardTitle>
              <CardDescription>Fast onboarding path from first request to production rollout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { step: "01", label: "Create API key", icon: KeyRound },
                { step: "02", label: "Call normalize route", icon: Route },
                { step: "03", label: "Scale with packs", icon: Braces },
              ].map((item) => (
                <div key={item.step} className="rounded-lg border border-stroke-soft bg-surface-panel p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Step {item.step}</p>
                  <p className="mt-1 text-sm text-foreground">{item.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card variant="panel">
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-between">
                <Link href="/openapi.yaml">
                  OpenAPI specification
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/dashboard/docs">
                  Dashboard quick start
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          <div className="section-shell rounded-2xl px-6 py-6">
            <h1 className="display-title text-4xl font-semibold text-foreground">FeeldKit API</h1>
            <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
              All endpoints are under{" "}
              <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">/api/v1</code>. Send{" "}
              <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">x-api-key</code> with a key
              issued from the admin dashboard (or a development key when{" "}
              <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">ALLOW_DEMO_API_KEY</code> is
              enabled).
            </p>
          </div>

          <Tabs
            defaultValue="first-call"
            items={[
              {
                id: "first-call",
                label: "First call",
                content: (
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle className="text-base">First normalization request</CardTitle>
                      <CardDescription>Minimal request/response path to verify your setup.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <pre className="overflow-x-auto rounded-lg bg-code p-4 font-mono text-sm text-code-foreground leading-relaxed">
                        {`curl -sS -H "x-api-key: YOUR_KEY" \\
  -H "content-type: application/json" \\
  -d '{"field_key":"countries","value":"NL"}' \\
  https://YOUR_HOST/api/v1/normalize`}
                      </pre>
                    </CardContent>
                  </Card>
                ),
              },
              {
                id: "route-clusters",
                label: "Route clusters",
                content: (
                  <div className="grid gap-4 md:grid-cols-3">
                    {clusters.map((cluster) => (
                      <Card key={cluster.label} variant="panel">
                        <CardHeader>
                          <CardTitle className="text-base">{cluster.label}</CardTitle>
                          <CardDescription>Core endpoints</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-1">
                          <ul className="space-y-2">
                            {cluster.routes.map((route) => (
                              <li key={route}>
                                <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-[11px] text-code-foreground">{route}</code>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </section>
      </div>
    </MarketingChrome>
  );
}

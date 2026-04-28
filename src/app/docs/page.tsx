import type { Metadata } from "next";
import Link from "next/link";
import { MarketingChrome } from "@/components/marketing-chrome";
import { ArrowRight, Braces, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "API documentation | FeeldKit",
  description: "Integrate FeeldKit field intelligence over HTTP with API keys.",
};

export default function PublicDocsPage() {
  const routes = [
    "GET /api/v1/packs",
    "GET /api/v1/field-types",
    "POST /api/v1/normalize",
    "POST /api/v1/validate",
    "POST /api/v1/parse",
    "GET /api/v1/crosswalk",
  ];

  return (
    <MarketingChrome>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">FeeldKit API</h1>
            <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
              All endpoints are under{" "}
              <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">/api/v1</code>. Send{" "}
              <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">x-api-key</code> with a key
              issued from the admin dashboard (or a development key when{" "}
              <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">ALLOW_DEMO_API_KEY</code> is
              enabled).
            </p>
          </div>

          <Tabs
            defaultValue="curl"
            items={[
              {
                id: "curl",
                label: "cURL",
                content: (
                  <Card variant="elevated">
                    <CardContent className="pt-6">
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
                id: "routes",
                label: "Core routes",
                content: (
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle className="text-base">Most-used endpoints</CardTitle>
                      <CardDescription>Route catalog for normalization and lookup workflows.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ul className="space-y-2">
                        {routes.map((route) => (
                          <li key={route}>
                            <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-xs text-code-foreground">{route}</code>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ),
              },
            ]}
          />
        </section>

        <aside className="space-y-4">
          <Card variant="feature">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg border border-brand/25 bg-brand-soft/60 text-brand-strong">
                <FileText className="size-5" />
              </div>
              <CardTitle className="text-base">Quick links</CardTitle>
              <CardDescription>Jump to key resources for integration and deployment.</CardDescription>
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

          <Card variant="elevated">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg border border-brand/25 bg-brand-soft/60 text-brand-strong">
                <Braces className="size-5" />
              </div>
              <CardTitle className="text-base">Project docs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Deployment checklist lives in <span className="font-mono text-foreground/80">docs/DEPLOYMENT.md</span>.</p>
              <p>Use a scoped key per environment for auditability and safer integrations.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </MarketingChrome>
  );
}

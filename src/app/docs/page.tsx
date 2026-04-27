import type { Metadata } from "next";
import Link from "next/link";
import { MarketingChrome } from "@/components/marketing-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "API documentation | FeeldKit",
  description: "Integrate FeeldKit field intelligence over HTTP with API keys.",
};

export default function PublicDocsPage() {
  return (
    <MarketingChrome>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">FeeldKit API</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          All endpoints are under{" "}
          <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">/api/v1</code>. Send{" "}
          <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">x-api-key</code> with a key
          issued from the admin dashboard (or a development key when{" "}
          <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">ALLOW_DEMO_API_KEY</code> is
          enabled).
        </p>
        <h2 className="mt-10 text-lg font-semibold text-foreground">Quick example</h2>
        <Card className="mt-3 border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">cURL</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="overflow-x-auto rounded-md bg-code p-4 font-mono text-sm text-code-foreground leading-relaxed">
              {`curl -sS -H "x-api-key: YOUR_KEY" \\
  -H "content-type: application/json" \\
  -d '{"field_key":"countries","value":"NL"}' \\
  https://YOUR_HOST/api/v1/normalize`}
            </pre>
          </CardContent>
        </Card>
        <h2 className="mt-10 text-lg font-semibold text-foreground">Core routes</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          <li className="flex flex-wrap items-baseline gap-2">
            <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">GET /api/v1/packs</code>
            <span className="text-sm">— list field packs</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2">
            <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">GET /api/v1/field-types</code>
            <span className="text-sm">— list field types</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2">
            <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">POST /api/v1/normalize</code>
            <span className="text-sm">— normalize a value</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2">
            <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">POST /api/v1/validate</code>,{" "}
            <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">POST /api/v1/parse</code>
          </li>
          <li className="flex flex-wrap items-baseline gap-2">
            <code className="rounded-md bg-code px-1.5 py-0.5 font-mono text-sm text-code-foreground">GET /api/v1/crosswalk</code>
            <span className="text-sm">— crosswalk lookup</span>
          </li>
        </ul>
        <p className="mt-10 text-sm text-muted-foreground">
          OpenAPI:{" "}
          <Link href="/openapi.yaml" className="font-medium text-primary hover:underline">
            /openapi.yaml
          </Link>
          . Deployment checklist: <span className="font-mono text-foreground/80">docs/DEPLOYMENT.md</span> in the repo.
        </p>
      </div>
    </MarketingChrome>
  );
}

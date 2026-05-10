import Link from "next/link";
import { ArrowRight, Code2, PlayCircle, Workflow } from "lucide-react";
import { MarketingChrome } from "@/components/marketing-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DevelopersPage() {
  return (
    <MarketingChrome>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
        <section className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-strong">Developer quickstart</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Ship a mapping flow in under an hour</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Install the SDK, run a deterministic flow pack, simulate sample records, and export governance settings between environments.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/developer">
                Open developer hub
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/docs">Read API docs</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Install the SDK",
              icon: Code2,
              body: "npm install @feeldkit/sdk and create a FeeldKitClient with a scoped API key.",
            },
            {
              title: "Run a flow pack",
              icon: Workflow,
              body: "Translate a SalesNav-like record into HubSpot-style fields with confidence and explain.v1 traces.",
            },
            {
              title: "Simulate before deploy",
              icon: PlayCircle,
              body: "Use simulation_profile.v1 to dry-run cases and assert expected targets without writing reviews.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} variant="panel" className="h-full">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.body}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </section>

        <Card variant="feature">
          <CardHeader>
            <CardTitle>Ten-line normalize example</CardTitle>
            <CardDescription>Typed responses include the normalized match, confidence, review status, and explain trace.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-code p-4 font-mono text-xs text-code-foreground">
              {`import { FeeldKitClient } from "@feeldkit/sdk";

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY!,
});

const result = await client.normalize.one({
  fieldKey: "company_industry",
  value: "computer software",
});

console.log(result.match?.label, result.confidence, result.explain.decision.status);`}
            </pre>
          </CardContent>
        </Card>
      </main>
    </MarketingChrome>
  );
}

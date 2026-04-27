import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API documentation | FeeldKit",
  description: "Integrate FeeldKit field intelligence over HTTP with API keys.",
};

export default function PublicDocsPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-teal-300">
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold">FeeldKit API</h1>
        <p className="mt-4 text-slate-300">
          All endpoints are under <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">/api/v1</code>. Send{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">x-api-key</code> with a key issued from the admin
          dashboard (or a development key when <code className="text-sm">ALLOW_DEMO_API_KEY</code> is enabled).
        </p>
        <h2 className="mt-10 text-lg font-medium text-teal-200">Quick example</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-200">
          {`curl -sS -H "x-api-key: YOUR_KEY" \\
  -H "content-type: application/json" \\
  -d '{"field_key":"countries","value":"NL"}' \\
  https://YOUR_HOST/api/v1/normalize`}
        </pre>
        <h2 className="mt-10 text-lg font-medium text-teal-200">Core routes</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
          <li>
            <code className="text-slate-200">GET /api/v1/packs</code> — list field packs
          </li>
          <li>
            <code className="text-slate-200">GET /api/v1/field-types</code> — list field types
          </li>
          <li>
            <code className="text-slate-200">POST /api/v1/normalize</code> — normalize a value
          </li>
          <li>
            <code className="text-slate-200">POST /api/v1/validate</code>, <code className="text-slate-200">POST /api/v1/parse</code>
          </li>
          <li>
            <code className="text-slate-200">GET /api/v1/crosswalk</code> — crosswalk lookup
          </li>
        </ul>
        <p className="mt-8 text-sm text-slate-500">
          OpenAPI: <Link href="/openapi.yaml" className="text-teal-400 hover:underline">/openapi.yaml</Link>. Deployment
          checklist: <code className="text-slate-400">docs/DEPLOYMENT.md</code> in the repo.
        </p>
      </div>
    </div>
  );
}

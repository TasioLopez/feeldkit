export default function DashboardDocsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Developer Docs</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-medium">Quick start</p>
        <pre className="mt-2 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {`curl -H "x-api-key: fk_demo_public_1234567890" \\
  -H "content-type: application/json" \\
  -d '{"field_key":"countries","value":"NL"}' \\
  http://localhost:3000/api/v1/normalize`}
        </pre>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p>Reference docs are available under the repository `docs/` folder for architecture, pack specification, and roadmap.</p>
      </div>
    </div>
  );
}

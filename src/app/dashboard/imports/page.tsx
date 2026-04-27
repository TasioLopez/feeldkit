const importSources = [
  { key: "iso_3166", name: "ISO 3166 country list", version: "sample-v1", status: "ready" },
  { key: "iso_4217", name: "ISO 4217 currencies", version: "sample-v1", status: "ready" },
  { key: "manual_practical", name: "Practical overlays", version: "v1", status: "ready" },
];

export default function DashboardImportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Imports</h1>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {importSources.map((entry) => (
              <tr key={entry.key} className="border-t border-slate-100">
                <td className="px-3 py-2">{entry.name}</td>
                <td className="px-3 py-2">{entry.version}</td>
                <td className="px-3 py-2">{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

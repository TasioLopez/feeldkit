import Link from "next/link";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export default async function DashboardPacksPage() {
  const repo = getFieldRepository();
  const packsList = await repo.getPacks();
  const allTypes = await repo.getFieldTypes();
  const packs = packsList.map((pack) => ({
    ...pack,
    fieldTypeCount: allTypes.filter((entry) => entry.fieldPackId === pack.id).length,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Field Packs</h1>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Pack</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Field Types</th>
            </tr>
          </thead>
          <tbody>
            {packs.map((pack) => (
              <tr key={pack.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Link href={`/dashboard/packs/${pack.key}`} className="text-teal-700 hover:underline">
                    {pack.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{pack.category}</td>
                <td className="px-3 py-2">{pack.status}</td>
                <td className="px-3 py-2">{pack.version}</td>
                <td className="px-3 py-2">{pack.fieldTypeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

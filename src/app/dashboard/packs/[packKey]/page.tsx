import Link from "next/link";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

interface Props {
  params: Promise<{ packKey: string }>;
}

export default async function DashboardPackDetailPage({ params }: Props) {
  const { packKey } = await params;
  const repo = getFieldRepository();
  const pack = await repo.getPackByKey(packKey);
  if (!pack) {
    return <p>Pack not found.</p>;
  }

  const fieldTypes = (await repo.getFieldTypes()).filter((entry) => entry.fieldPackId === pack.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{pack.name}</h1>
        <p className="text-slate-600">{pack.description}</p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-medium">Version</p>
        <p className="text-sm text-slate-600">{pack.version}</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-medium">Field Types</p>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
          {fieldTypes.map((type) => (
            <li key={type.id}>
              <Link href={`/dashboard/field-types/${type.key}`} className="text-teal-700 hover:underline">
                {type.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

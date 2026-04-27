import { getFieldRepository } from "@/lib/repositories/get-field-repository";

interface Props {
  params: Promise<{ fieldKey: string }>;
}

export default async function FieldTypeDetailPage({ params }: Props) {
  const { fieldKey } = await params;
  const repo = getFieldRepository();
  const type = await repo.getFieldTypeByKey(fieldKey);
  if (!type) {
    return <p>Field type not found.</p>;
  }
  const values = await repo.getValuesByFieldKey(fieldKey);
  const aliases = await repo.getAliasesForType(type.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{type.name}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-medium">Values</p>
          <ul className="mt-2 max-h-80 list-disc overflow-auto pl-5 text-sm">
            {values.map((value) => (
              <li key={value.id}>
                {value.label} <span className="text-slate-500">({value.key})</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-medium">Aliases</p>
          <ul className="mt-2 max-h-80 list-disc overflow-auto pl-5 text-sm">
            {aliases.map((entry) => (
              <li key={entry.id}>
                {entry.alias} <span className="text-slate-500">({entry.confidence})</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

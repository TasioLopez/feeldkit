import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { listReviewQueue } from "@/lib/matching/review-queue";
import { getMemoryUsageEvents } from "@/lib/telemetry/usage-events";

export default async function DashboardPage() {
  const repo = getFieldRepository();
  const packs = (await repo.getPacks()).length;
  const fieldTypes = (await repo.getFieldTypes()).length;
  const types = await repo.getFieldTypes();
  let values = 0;
  for (const type of types) {
    values += (await repo.getValuesByFieldKey(type.key)).length;
  }
  const pendingReviews = listReviewQueue().length;
  const usage = getMemoryUsageEvents().length;

  const cards = [
    { label: "Field packs", value: packs },
    { label: "Field types", value: fieldTypes },
    { label: "Values", value: values },
    { label: "Pending reviews", value: pendingReviews },
    { label: "API usage events (memory)", value: usage },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <section key={card.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

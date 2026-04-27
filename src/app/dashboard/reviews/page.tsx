import { listReviewQueue } from "@/lib/matching/review-queue";

export default function DashboardReviewsPage() {
  const reviews = listReviewQueue();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Review Queue</h1>
      <p className="mt-2 text-sm text-slate-600">Low confidence and unmatched mappings are listed here for triage.</p>
      <div className="mt-4 space-y-3">
        {reviews.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No pending reviews.</div>
        ) : (
          reviews.map((item) => (
            <article key={item.id} className="rounded border border-slate-200 bg-white p-4">
              <p className="font-medium">{item.input}</p>
              <p className="text-sm text-slate-600">
                field: {item.fieldKey} · confidence: {item.confidence.toFixed(2)}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

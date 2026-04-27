import type { Metadata } from "next";
import { listReviewQueue } from "@/lib/matching/review-queue";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Review queue | FeeldKit",
  description: "Triage low-confidence normalizations.",
};

function confidenceVariant(c: number): "success" | "warning" | "destructive" | "muted" {
  if (c >= 0.85) return "success";
  if (c >= 0.5) return "warning";
  if (c > 0) return "destructive";
  return "muted";
}

export default function DashboardReviewsPage() {
  const reviews = listReviewQueue();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Review queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Low confidence and unmatched mappings are listed here for triage.</p>
      </div>
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">All clear</CardTitle>
              <CardDescription>No pending reviews right now.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          reviews.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium leading-snug">{item.input}</CardTitle>
                  <Badge variant={confidenceVariant(item.confidence)}>confidence {item.confidence.toFixed(2)}</Badge>
                </div>
                <CardDescription className="font-mono text-xs text-muted-foreground">
                  field: {item.fieldKey} · queued for manual review or alias enrichment
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

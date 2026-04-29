import type { Metadata } from "next";
import { getAdminActorContext } from "@/lib/auth/admin-context";
import { listReviewQueue } from "@/lib/matching/review-queue";
import { listPendingEnrichmentProposals } from "@/lib/enrichment/proposal-service";
import {
  approveReviewAction,
  bulkApprovePendingProposalsAction,
  bulkRejectPendingProposalsAction,
  decideEnrichmentProposalAction,
  decideEnrichmentProposalWithEditsAction,
  rejectReviewAction,
} from "./actions";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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

export default async function DashboardReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const statusFilter = (params.status ?? "all").toLowerCase();
  const actor = await getAdminActorContext();
  const reviewsRaw = await listReviewQueue(actor?.organizationId);
  const proposalsRaw = actor?.organizationId ? await listPendingEnrichmentProposals(actor.organizationId) : [];
  const reviews = reviewsRaw.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (!query) return true;
    return item.input.toLowerCase().includes(query) || item.fieldKey.toLowerCase().includes(query);
  });
  const proposals = proposalsRaw.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (!query) return true;
    return (
      item.sourceInput.toLowerCase().includes(query) ||
      item.suggestedLabel.toLowerCase().includes(query) ||
      item.suggestedKey.toLowerCase().includes(query)
    );
  });
  const proposalIdsCsv = proposals.map((item) => item.id).join(",");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description="Low confidence and unmatched mappings are listed here for triage."
      />
      <Reveal>
        <DataToolbar
        placeholder="Filter by field, input, key, or label"
        rightSlot={
          <div className="flex items-center gap-2 flex-wrap">
            <a
              className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              href="/dashboard/reviews?status=all"
            >
              all
            </a>
            <a
              className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              href="/dashboard/reviews?status=pending"
            >
              pending
            </a>
            <a
              className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              href="/dashboard/reviews?status=approved"
            >
              approved
            </a>
            <span className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground">
              {reviews.length} mapping reviews
            </span>
            <span className="rounded-full border border-stroke-soft bg-surface-panel px-3 py-1 text-xs text-muted-foreground">
              {proposals.length} AI proposals
            </span>
          </div>
        }
      />
      </Reveal>
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <Reveal>
            <EmptyState title="All clear" description="No pending reviews right now." />
          </Reveal>
        ) : (
          reviews.map((item, index) => (
            <Reveal key={item.id} delay={Math.min(index * 0.04, 0.24)}>
              <Card variant="elevated">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium leading-snug">{item.input}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={confidenceVariant(item.confidence)}>confidence {item.confidence.toFixed(2)}</Badge>
                    <Badge variant={item.status === "pending" ? "warning" : item.status === "approved" ? "success" : "muted"}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="font-mono text-xs text-muted-foreground">
                  field: {item.fieldKey} · queued for manual review or alias enrichment
                </CardDescription>
                {item.status === "pending" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={approveReviewAction.bind(null, item.id, item.suggestedValueId)}>
                      <Button type="submit" size="sm" variant="brand">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectReviewAction.bind(null, item.id)}>
                      <Button type="submit" size="sm" variant="soft">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : null}
              </CardHeader>
              </Card>
            </Reveal>
          ))
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">AI enrichment proposals</h2>
        {proposals.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <form action={bulkApprovePendingProposalsAction}>
              <input type="hidden" name="proposal_ids" value={proposalIdsCsv} />
              <Button type="submit" size="sm" variant="brand">
                Bulk approve visible
              </Button>
            </form>
            <form action={bulkRejectPendingProposalsAction}>
              <input type="hidden" name="proposal_ids" value={proposalIdsCsv} />
              <Button type="submit" size="sm" variant="soft">
                Bulk reject visible
              </Button>
            </form>
          </div>
        ) : null}
        {proposals.length === 0 ? (
          <Card variant="panel">
            <CardHeader>
              <CardTitle className="text-base">No pending AI proposals</CardTitle>
              <CardDescription>Use the enrichment endpoint to generate pending suggestions for review.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          proposals.map((proposal, index) => (
            <Reveal key={proposal.id} delay={Math.min(index * 0.04, 0.2)}>
              <Card variant="panel">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base font-medium leading-snug">{proposal.suggestedLabel}</CardTitle>
                    <Badge variant="brand">{Math.round(proposal.confidence * 100)}%</Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    source input: {proposal.sourceInput} · key: {proposal.suggestedKey}
                    {proposal.reasoning ? ` · ${proposal.reasoning}` : ""}
                  </CardDescription>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={decideEnrichmentProposalAction.bind(null, proposal.id, "approved")}>
                      <Button type="submit" size="sm" variant="brand">
                        Approve + apply
                      </Button>
                    </form>
                    <form action={decideEnrichmentProposalAction.bind(null, proposal.id, "rejected")}>
                      <Button type="submit" size="sm" variant="soft">
                        Reject
                      </Button>
                    </form>
                  </div>
                  <form action={decideEnrichmentProposalWithEditsAction} className="mt-3 grid gap-2 md:grid-cols-4">
                    <input type="hidden" name="proposal_id" value={proposal.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <input
                      name="override_key"
                      defaultValue={proposal.suggestedKey}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                    <input
                      name="override_label"
                      defaultValue={proposal.suggestedLabel}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                    <input
                      name="notes"
                      placeholder="Optional note"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Approve with edits
                    </Button>
                  </form>
                </CardHeader>
              </Card>
            </Reveal>
          ))
        )}
      </div>
    </div>
  );
}

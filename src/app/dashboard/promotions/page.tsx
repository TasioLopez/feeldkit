import type { Metadata } from "next";
import { Layers } from "lucide-react";
import Link from "next/link";
import { getAdminActorContext, isPlatformAdmin } from "@/lib/auth/admin-context";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { listPromotionProposals } from "@/lib/promotion/repository";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/motion/reveal";
import { approvePromotionProposalAction, rejectPromotionProposalAction } from "./actions";

export const metadata: Metadata = {
  title: "Promotions (curator) | FeeldKit",
  description: "Pending global promotion proposals across organizations.",
};

export default async function DashboardPromotionsPage() {
  const actor = await getAdminActorContext();
  const admin = getSupabaseServiceClient();
  const isCurator = actor ? isPlatformAdmin(actor.role) : false;
  const proposals =
    admin && isCurator
      ? await listPromotionProposals(admin, { status: ["pending_global"], limit: 200 })
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotion curator queue"
        description="Approve or reject proposals staged for the global seed. Requires profile role platform_admin."
      />

      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/promotions/registry"
            className="inline-flex items-center gap-2 rounded-lg border border-stroke-soft bg-surface-panel px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Layers className="size-4" aria-hidden />
            Registry & changelog
          </Link>
        </div>
      </Reveal>

      {!actor?.organizationId ? (
        <EmptyState title="Sign in required" description="Connect Supabase and sign in." />
      ) : !isCurator ? (
        <EmptyState
          title="Curator access only"
          description="Set your profile role to platform_admin in Supabase (profiles.role) to manage the global promotion queue."
        />
      ) : proposals.length === 0 ? (
        <EmptyState title="Queue empty" description="No pending_global proposals right now." />
      ) : (
        <div className="space-y-3">
          {proposals.map((p, index) => (
            <Reveal key={p.id} delay={Math.min(index * 0.04, 0.2)}>
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base font-mono text-xs">{p.id}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="warning">{p.status}</Badge>
                      <Badge variant="outline">{p.targetTable}</Badge>
                      <Badge variant="muted">{p.sourceKind}</Badge>
                    </div>
                  </div>
                  <CardDescription className="font-mono text-[11px]">
                    org {p.organizationId} · source {p.sourceId}
                  </CardDescription>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-stroke-soft bg-surface-panel p-2 text-[10px] text-muted-foreground">
                    {JSON.stringify(p.payload, null, 2)}
                  </pre>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <form action={approvePromotionProposalAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="proposal_id" value={p.id} />
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground" htmlFor={`notes-${p.id}`}>
                          Notes (optional)
                        </label>
                        <Input id={`notes-${p.id}`} name="notes" placeholder="curator note" className="h-9 w-56 text-xs" />
                      </div>
                      <Button type="submit" size="sm" variant="brand">
                        Approve → global
                      </Button>
                    </form>
                    <form action={rejectPromotionProposalAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="proposal_id" value={p.id} />
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground" htmlFor={`reason-${p.id}`}>
                          Reason (optional)
                        </label>
                        <Input id={`reason-${p.id}`} name="reason" placeholder="reject reason" className="h-9 w-56 text-xs" />
                      </div>
                      <Button type="submit" size="sm" variant="soft">
                        Reject
                      </Button>
                    </form>
                  </div>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

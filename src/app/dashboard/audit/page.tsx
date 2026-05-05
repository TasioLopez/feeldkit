import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { getAdminActorContext } from "@/lib/auth/admin-context";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Audit log | FeeldKit",
  description: "Governance and review audit entries.",
};

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  created_at: string;
};

export default async function AuditDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ entity_type?: string; action?: string; entity_id?: string }>;
}) {
  const params = await searchParams;
  const actor = await getAdminActorContext();
  const admin = getSupabaseServiceClient();

  let rows: AuditRow[] = [];
  if (actor?.organizationId && admin) {
    let q = admin
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, actor_id, created_at")
      .eq("organization_id", actor.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (params.entity_type?.trim()) {
      q = q.eq("entity_type", params.entity_type.trim());
    }
    if (params.action?.trim()) {
      q = q.eq("action", params.action.trim());
    }
    if (params.entity_id?.trim()) {
      q = q.eq("entity_id", params.entity_id.trim());
    }

    const { data } = await q;
    rows = (data as AuditRow[]) ?? [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Recent governance actions for your organization (service-role read)."
      />

      {!actor?.organizationId ? (
        <EmptyState title="Sign in required" description="Sign in as an org member to load audit_logs." />
      ) : !admin ? (
        <EmptyState title="Audit unavailable" description="SUPABASE_SERVICE_ROLE_KEY is not configured in this environment." />
      ) : (
        <>
          <Reveal>
            <Card variant="panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ScrollText className="size-4 text-muted-foreground" aria-hidden />
                  <CardTitle className="text-base">Filters</CardTitle>
                </div>
                <CardDescription className="flex flex-wrap gap-3 text-xs">
                  <Link className="underline underline-offset-2 hover:text-foreground" href="/dashboard/audit">
                    Clear
                  </Link>
                  <Link className="underline underline-offset-2 hover:text-foreground" href="/dashboard/audit?entity_type=mapping_reviews">
                    mapping_reviews
                  </Link>
                  <Link className="underline underline-offset-2 hover:text-foreground" href="/dashboard/audit?action=review.approve">
                    review.approve
                  </Link>
                  <Link className="underline underline-offset-2 hover:text-foreground" href="/dashboard/audit?action=review.undo">
                    review.undo
                  </Link>
                </CardDescription>
              </CardHeader>
            </Card>
          </Reveal>

          <Reveal delay={0.06}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-base">Latest entries</CardTitle>
                <CardDescription>
                  Showing up to 100 rows
                  {params.entity_type ? ` · entity_type=${params.entity_type}` : ""}
                  {params.action ? ` · action=${params.action}` : ""}
                  {params.entity_id ? ` · entity_id=${params.entity_id.slice(0, 8)}…` : ""}
                </CardDescription>
              </CardHeader>
              <div className="border-t border-stroke-soft px-6 py-4">
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No audit rows match.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="pb-2 pr-3">time</th>
                          <th className="pb-2 pr-3">action</th>
                          <th className="pb-2 pr-3">entity</th>
                          <th className="pb-2">actor</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground">
                        {rows.map((r) => (
                          <tr key={r.id} className="border-t border-stroke-soft/80 align-top">
                            <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toISOString().slice(0, 19)}Z</td>
                            <td className="py-2 pr-3">{r.action}</td>
                            <td className="py-2 pr-3">
                              {r.entity_type}
                              {r.entity_id ? (
                                <>
                                  <br />
                                  <span className="text-muted-foreground">{r.entity_id}</span>
                                </>
                              ) : null}
                            </td>
                            <td className="py-2 max-w-[140px] truncate">{r.actor_id ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}

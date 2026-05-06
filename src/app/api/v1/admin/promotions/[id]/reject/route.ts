import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { writeAudit } from "@/lib/governance/audit";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getPromotionProposal, setProposalStatus } from "@/lib/promotion/repository";

const bodySchema = z
  .object({
    reason: z.string().optional(),
  })
  .optional();

export const POST = createScopedHandler("admin:promotions", async (request) => {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const proposalId = segments[4];
  if (!proposalId || segments[5] !== "reject") {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const proposal = await getPromotionProposal(admin, proposalId);
  if (!proposal) {
    return NextResponse.json({ error: "proposal_not_found" }, { status: 404 });
  }
  if (proposal.status !== "pending_global") {
    return NextResponse.json(
      { error: "invalid_state", message: `Proposal status is ${proposal.status}; only pending_global can be rejected.` },
      { status: 409 },
    );
  }

  const apiKeyId = request.headers.get("x-feeldkit-api-key-id");
  const curatorId = apiKeyId ?? null;

  const auditId = await writeAudit({
    organizationId: proposal.organizationId,
    actorId: curatorId,
    action: "promotion.reject_global",
    entityType: "promotion_proposals",
    entityId: proposal.id,
    before: { status: proposal.status },
    after: { status: "rejected", reason: parsed.data?.reason ?? null },
  });

  await setProposalStatus(admin, {
    proposalId: proposal.id,
    status: "rejected",
    curatorId,
    curatorNotes: parsed.data?.reason ?? null,
    auditLogId: auditId,
  });

  return NextResponse.json({ ok: true });
});

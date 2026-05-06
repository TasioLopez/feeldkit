import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { undoPromotedProposalDecision } from "@/lib/enrichment/proposal-service";

export const POST = createScopedHandler("admin:reviews", async (request) => {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const proposalId = segments[4];
  if (!proposalId || segments[5] !== "undo") {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  const organizationId = request.headers.get("x-feeldkit-organization-id");
  if (!organizationId) {
    return NextResponse.json({ error: "API key is not scoped to an organization" }, { status: 400 });
  }

  const apiKeyId = request.headers.get("x-feeldkit-api-key-id");
  const result = await undoPromotedProposalDecision({
    proposalId,
    organizationId,
    actorId: apiKeyId ?? organizationId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "undo_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
});

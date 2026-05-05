import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { undoPromotedReviewDecision } from "@/lib/reviews/review-promotion";

export const POST = createScopedHandler("admin:reviews", async (request) => {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const reviewId = segments[4];
  if (!reviewId || segments[5] !== "undo") {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  const organizationId = request.headers.get("x-feeldkit-organization-id");
  if (!organizationId) {
    return NextResponse.json({ error: "API key is not scoped to an organization" }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: reviewRow } = await admin
    .from("mapping_reviews")
    .select("id")
    .eq("id", reviewId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!reviewRow) {
    return NextResponse.json({ error: "review_not_found" }, { status: 404 });
  }

  const apiKeyId = request.headers.get("x-feeldkit-api-key-id");
  const result = await undoPromotedReviewDecision({
    admin,
    reviewId,
    organizationId,
    actorId: apiKeyId ?? organizationId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "undo_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
});

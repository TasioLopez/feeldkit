import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/admin-context", () => ({
  assertAdminRole: vi.fn(),
  getAdminActorContext: vi.fn(async () => ({
    userId: "user-1",
    organizationId: "org-1",
    role: "owner",
    email: "a@b.com",
  })),
}));

vi.mock("@/lib/governance/audit", () => ({
  writeAudit: vi.fn(async () => "audit-1"),
}));

vi.mock("@/lib/reviews/review-promotion", () => ({
  fetchAliasRowForReview: vi.fn(async () => null),
  PROMOTED_ALIAS_ABSENT: { absent: true },
  recordReviewAliasPromotion: vi.fn(async () => {}),
  undoPromotedReviewDecision: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/reviews/review-service", () => ({
  setReviewDecision: vi.fn(async () => ({ ok: true })),
}));

let serviceClient: unknown = null;
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceClient: () => serviceClient,
}));

import { approveReviewAction, rejectReviewAction } from "@/app/dashboard/reviews/actions";
import { recordReviewAliasPromotion } from "@/lib/reviews/review-promotion";
import { setReviewDecision } from "@/lib/reviews/review-service";
import { writeAudit } from "@/lib/governance/audit";

describe("dashboard/reviews/actions", () => {
  beforeEach(() => {
    vi.mocked(recordReviewAliasPromotion).mockClear();
    vi.mocked(writeAudit).mockClear();
    vi.mocked(setReviewDecision).mockClear();
    serviceClient = null;
  });

  it("approve skips promotion path when service role client is missing", async () => {
    await approveReviewAction("rev-1", null);
    expect(recordReviewAliasPromotion).not.toHaveBeenCalled();
    expect(setReviewDecision).not.toHaveBeenCalled();
  });

  it("reject skips audit update when service role client is missing", async () => {
    await rejectReviewAction("rev-1");
    expect(setReviewDecision).toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });
});

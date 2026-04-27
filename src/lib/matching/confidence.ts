import type { MappingStatus } from "@/lib/domain/types";

export function classifyConfidence(score: number): { status: MappingStatus; needsReview: boolean } {
  if (score >= 0.9) {
    return { status: "matched", needsReview: false };
  }
  if (score >= 0.65) {
    return { status: "suggested", needsReview: false };
  }
  return { status: "review", needsReview: true };
}

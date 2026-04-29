interface ReviewQueueItem {
  id: string;
  organizationId: string | null;
  fieldTypeId: string | null;
  fieldKey: string;
  input: string;
  normalizedInput: string;
  confidence: number;
  status: "pending" | "approved" | "rejected";
  suggestedValueId: string | null;
  selectedValueId: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
}

const inMemoryReviewQueue: ReviewQueueItem[] = [];

export async function enqueueReview(item: Omit<ReviewQueueItem, "id" | "createdAt">): Promise<ReviewQueueItem> {
  if (item.organizationId && item.fieldTypeId) {
    const { queueReviewRecord } = await import("@/lib/reviews/review-service");
    const dbItem = await queueReviewRecord({
      organizationId: item.organizationId,
      fieldTypeId: item.fieldTypeId,
      input: item.input,
      normalizedInput: item.normalizedInput,
      confidence: item.confidence,
      suggestedValueId: item.suggestedValueId,
    });
    if (dbItem) {
      return {
        id: dbItem.id,
        organizationId: dbItem.organizationId,
        fieldTypeId: dbItem.fieldTypeId,
        fieldKey: dbItem.fieldKey,
        input: dbItem.input,
        normalizedInput: dbItem.normalizedInput,
        confidence: item.confidence,
        status: dbItem.status,
        suggestedValueId: dbItem.suggestedValueId,
        selectedValueId: dbItem.selectedValueId,
        reviewedAt: dbItem.reviewedAt,
        notes: dbItem.notes,
        createdAt: dbItem.createdAt,
      };
    }
  }

  const queued: ReviewQueueItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...item,
  };
  inMemoryReviewQueue.push(queued);
  return queued;
}

export async function listReviewQueue(organizationId?: string | null): Promise<ReviewQueueItem[]> {
  if (organizationId) {
    const { listReviewRecords } = await import("@/lib/reviews/review-service");
    const dbReviews = await listReviewRecords(organizationId);
    if (dbReviews.length > 0) {
      return dbReviews.map((item) => ({
        id: item.id,
        organizationId: item.organizationId,
        fieldTypeId: item.fieldTypeId,
        fieldKey: item.fieldKey,
        input: item.input,
        normalizedInput: item.normalizedInput,
        confidence: item.confidence,
        status: item.status,
        suggestedValueId: item.suggestedValueId,
        selectedValueId: item.selectedValueId,
        reviewedAt: item.reviewedAt,
        notes: item.notes,
        createdAt: item.createdAt,
      }));
    }
  }
  return [...inMemoryReviewQueue].reverse();
}

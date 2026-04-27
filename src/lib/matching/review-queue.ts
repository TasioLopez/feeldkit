interface ReviewQueueItem {
  id: string;
  fieldKey: string;
  input: string;
  normalizedInput: string;
  confidence: number;
  createdAt: string;
}

const inMemoryReviewQueue: ReviewQueueItem[] = [];

export function enqueueReview(item: Omit<ReviewQueueItem, "id" | "createdAt">): ReviewQueueItem {
  const queued: ReviewQueueItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...item,
  };
  inMemoryReviewQueue.push(queued);
  return queued;
}

export function listReviewQueue(): ReviewQueueItem[] {
  return [...inMemoryReviewQueue].reverse();
}

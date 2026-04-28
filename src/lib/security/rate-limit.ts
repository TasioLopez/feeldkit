const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 240;

type RateLimitCounter = { count: number; windowStart: number };

export interface RateLimitStore {
  get(key: string): RateLimitCounter | undefined;
  set(key: string, value: RateLimitCounter): void;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, RateLimitCounter>();

  get(key: string): RateLimitCounter | undefined {
    return this.counters.get(key);
  }

  set(key: string, value: RateLimitCounter): void {
    this.counters.set(key, value);
  }
}

let store: RateLimitStore = new InMemoryRateLimitStore();

/**
 * Allows replacing the backing store (e.g. Redis) while preserving in-memory default.
 */
export function configureRateLimitStore(nextStore: RateLimitStore): void {
  store = nextStore;
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const item = store.get(key);
  if (!item) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (now - item.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (item.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  item.count += 1;
  store.set(key, item);
  return true;
}

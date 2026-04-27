const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 240;

const counters = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const item = counters.get(key);
  if (!item) {
    counters.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (now - item.windowStart > WINDOW_MS) {
    counters.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (item.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  item.count += 1;
  counters.set(key, item);
  return true;
}

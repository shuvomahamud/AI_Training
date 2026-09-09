type Entry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Entry>();
const MAX_KEYS = 10_000;

function prune(now: number): void {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }

  if (attempts.size <= MAX_KEYS) return;
  const overflow = attempts.size - MAX_KEYS;
  let removed = 0;
  for (const key of attempts.keys()) {
    attempts.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  if (attempts.size >= MAX_KEYS) prune(now);

  const existing = attempts.get(key);
  if (!existing || existing.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}

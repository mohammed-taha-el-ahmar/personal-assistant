// Best-effort per-isolate rate limiter. Cloudflare runs many isolates, so this is a
// soft limit only — swap for the Rate Limiting binding or a Durable Object for a hard one.
import { DEFAULTS } from './config.js';

const buckets = new Map(); // ip → { count, windowStart }

export function isRateLimited(ip, now = Date.now()) {
  const entry = buckets.get(ip) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > DEFAULTS.RATE_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
  } else {
    entry.count++;
  }
  buckets.set(ip, entry);
  return entry.count > DEFAULTS.RATE_LIMIT;
}

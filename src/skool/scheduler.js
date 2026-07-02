// Shared request scheduler: run async tasks at a bounded concurrency behind a single rate-limit
// circuit-breaker. Extracted so per-author level lookups (F2) and notification mark-all (F9) reuse
// the pacing pattern crawl.js proved live — instead of firing an uncapped burst at WAF-gated api2.
// Pure + injectable (no DOM, no real timers): node --test covers concurrency, the breaker, and cache.

const DEFAULT_CONCURRENCY = 3;

/**
 * A settled task result, returned in INPUT ORDER.
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: unknown, rateLimited: boolean }} Settled
 */

/**
 * Run async task thunks at a bounded concurrency. Results come back in input order as settle
 * objects (a single task failure never rejects the whole call). When any task is flagged
 * rate-limited (`isRateLimited(error) === true`, e.g. an HTTP 403 / WAF block), the shared breaker
 * TRIPS: no new tasks start, and every not-yet-started task settles `{ ok:false, rateLimited:true }`.
 * Callers can then surface one "reload Skool and retry" hint instead of hammering a blocked endpoint.
 *
 * @template T
 * @param {Array<() => Promise<T>>} tasks
 * @param {{ concurrency?: number, isRateLimited?: (error: unknown) => boolean }} [opts]
 * @returns {Promise<Array<Settled<T>>>}
 */
export async function runCapped(tasks, opts = {}) {
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);
  const isRateLimited = opts.isRateLimited ?? (() => false);
  /** @type {Array<Settled<T>>} */
  const results = new Array(tasks.length);
  let next = 0;
  let tripped = false;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      if (tripped) {
        results[i] = { ok: false, error: new Error('rate-limited: breaker open'), rateLimited: true };
        continue;
      }
      try {
        results[i] = { ok: true, value: await tasks[i]() };
      } catch (error) {
        const rateLimited = Boolean(isRateLimited(error));
        if (rateLimited) tripped = true;
        results[i] = { ok: false, error, rateLimited };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Wrap a keyed async fetch so repeat keys resolve from an in-memory cache for the wrapper's lifetime
 * (one per session). The in-flight promise is cached, so concurrent callers for the same key share
 * one request. A rejected fetch is evicted so a later call can retry.
 * @template T
 * @param {(key: string) => Promise<T>} fetchOne
 * @returns {(key: string) => Promise<T>}
 */
export function cacheByKey(fetchOne) {
  /** @type {Map<string, Promise<T>>} */
  const cache = new Map();
  return (key) => {
    const hit = cache.get(key);
    if (hit) return hit;
    const p = Promise.resolve().then(() => fetchOne(key));
    cache.set(key, p);
    p.catch(() => cache.delete(key));
    return p;
  };
}

// On-demand member-level lookups (F2). Each visible author's group level is fetched at most ONCE
// per community session via read.getMemberPreview, single-flighted + cached through the shared
// scheduler's cacheByKey. This is the orchestration seam only — the reactive `Map<userId, level>`
// that the UI renders lives in the feed store; here we just resolve a userId to a level (or null).
// Pure + injectable (fetchPreview, getWafToken) so node --test covers caching without a network.

import { getMemberPreview } from './read.js';
import { cacheByKey } from './scheduler.js';

/**
 * Build a cached, single-flight level fetcher for one community session. Repeat calls for the same
 * userId share one in-flight request and resolve from cache thereafter; a failed lookup resolves to
 * `null` (no badge) rather than throwing, and is evicted so a later call can retry.
 * @param {object} args
 * @param {string} args.groupId The community group's uuid.
 * @param {() => Promise<string>} args.getWafToken Resolves the current AWS-WAF token.
 * @param {typeof getMemberPreview} [args.fetchPreview] Injected for tests (default read.getMemberPreview).
 * @returns {(userId: string) => Promise<number | null>}
 */
export function createLevelFetcher({ groupId, getWafToken, fetchPreview = getMemberPreview }) {
  const get = cacheByKey(async (/** @type {string} */ userId) => {
    const wafToken = await getWafToken();
    const res = await fetchPreview({ userId, groupId, wafToken });
    return res?.level ?? null;
  });
  /** @param {string} userId @returns {Promise<number | null>} */
  return (userId) => (userId ? get(userId).catch(() => null) : Promise.resolve(null));
}

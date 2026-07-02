// Accurate like/comment counts for feed rows. The feed-listing API returns a metadata snapshot
// (`post.upvotes`/`post.comments`) that can lag behind reality — opening a post via `getPost`
// often shows a different, current count. This module fetches the real per-post counts in the
// background for whatever's currently visible and caches the overrides (in-memory + persisted),
// so the list and the open post never visibly disagree.

import browser from 'webextension-polyfill';
import { getPost } from '../../skool/read.js';
import { ingestFeedLevels } from '../memberLevels.svelte.js';

/** @typedef {{ upvotes?: number, comments?: number }} StatOverride */

/** @type {Map<string, StatOverride>} */
let statOverrides = $state(new Map());
// Bumped on every merge — see memberLevels.svelte.js for why this can't be exported directly and
// why reading it inside a $derived is what makes already-rendered rows update.
let statOverridesRevision = $state(0);
const prefetchedIds = new Set();

const STAT_CACHE_KEY = 'sv-stat-overrides';
/** @type {ReturnType<typeof setTimeout> | undefined} */
let persistTimer;
/** @type {Record<string, { u?: number, c?: number }>} */
let persistData = {};

/** @returns {number} */
export function getStatOverridesRevision() {
  return statOverridesRevision;
}

/**
 * @param {string} id
 * @returns {StatOverride | undefined}
 */
export function getStatOverride(id) {
  getStatOverridesRevision();
  return statOverrides.get(id);
}

/**
 * @param {string} id
 * @param {number | null} [upvotes]
 * @param {number | null} [comments]
 */
export function setStatOverride(id, upvotes, comments) {
  const current = statOverrides.get(id) ?? {};
  const next = {
    upvotes: upvotes ?? current.upvotes,
    comments: comments ?? current.comments,
  };
  const merged = new Map(statOverrides);
  merged.set(id, next);
  statOverrides = merged;
  statOverridesRevision += 1;
  persistOverride(id, next.upvotes, next.comments);
}

/**
 * @param {string} id
 * @param {number | undefined} upvotes
 * @param {number | undefined} comments
 */
function persistOverride(id, upvotes, comments) {
  persistData[id] = { u: upvotes, c: comments };
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void browser.storage.local.set({ [STAT_CACHE_KEY]: persistData }).catch(() => {});
    persistTimer = undefined;
  }, 1500);
}

/** Hydrate the cache from storage — call once at boot, before the feed starts rendering. */
export async function loadStatCache() {
  try {
    const got = await browser.storage.local.get(STAT_CACHE_KEY);
    const data = /** @type {Record<string, { u?: number, c?: number }>} */ (got?.[STAT_CACHE_KEY] ?? {});
    persistData = data;
    const entries = Object.entries(data);
    if (!entries.length) return;
    const merged = new Map();
    for (const [id, stats] of entries) merged.set(id, { upvotes: stats.u, comments: stats.c });
    statOverrides = merged;
    statOverridesRevision += 1;
  } catch (err) {
    console.warn('[skool-view] stat cache load failed:', err);
  }
}

/** Clear the in-memory cache — call on community switch/refresh so stale overrides don't leak in. */
export function resetStatOverrides() {
  statOverrides = new Map();
  statOverridesRevision += 1;
  prefetchedIds.clear();
}

/**
 * @param {import('../../skool/map.js').PostView} post
 * @param {string} buildId
 * @param {string} slug
 */
async function prefetchOne(post, buildId, slug) {
  try {
    const { post: full } = await getPost({ buildId, slug, postSlug: post.slug });
    if (full) {
      const upvotes = typeof full.upvotes === 'number' ? full.upvotes : null;
      const comments = typeof full.comments === 'number' ? full.comments : null;
      if (upvotes != null || comments != null) setStatOverride(post.id, upvotes, comments);
      // The single-post route returns richer author data than the feed listing — same reason its
      // upvotes/comments are more accurate, its `author.level` is more often populated too. Feed
      // it into the shared member-level cache so every prefetched row's author benefits, not just
      // this one post.
      ingestFeedLevels(full);
    }
  } catch (err) {
    console.warn('[skool-view] stat prefetch failed:', post.id.slice(0, 8), err);
  }
}

/**
 * Fetch accurate counts for up to `batchSize` not-yet-fetched posts — the first 5 in parallel
 * (so the visible rows correct themselves immediately), the rest in gentle batches of 3 with a
 * pause between, so a long visible window doesn't fire dozens of requests at once.
 * @param {import('../../skool/map.js').PostView[]} posts
 * @param {string} buildId
 * @param {string} slug
 * @param {number} [batchSize]
 */
export async function prefetchStats(posts, buildId, slug, batchSize = 30) {
  const withSlug = posts.filter((p) => p.slug);
  const notFetched = withSlug.filter((p) => !prefetchedIds.has(p.id));
  const toFetch = notFetched.slice(0, batchSize);
  if (!toFetch.length) return;
  toFetch.forEach((p) => prefetchedIds.add(p.id));

  const first = toFetch.slice(0, 5);
  const rest = toFetch.slice(5);
  await Promise.all(first.map((p) => prefetchOne(p, buildId, slug)));
  for (let i = 0; i < rest.length; i += 3) {
    await new Promise((r) => setTimeout(r, 300));
    await Promise.all(rest.slice(i, i + 3).map((p) => prefetchOne(p, buildId, slug)));
  }
}

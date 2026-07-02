// Shared member-level cache plus the scraping helpers that populate it.
// The cache is keyed by a normalized author name (lowercase, trimmed) so UI code can ask for a
// level by display name without caring which Skool surface supplied the value.

import { BASE, API2_BASE, membersUrl, pageUrl } from '../skool/routes.js';

let memberLevels = $state(new Map());
// Bumped whenever the cache is merged with new data. Svelte 5 doesn't allow exporting a
// reassigned `$state` binding directly, so consumers read it through `getMemberLevelsRevision()`
// — that read is what makes `Avatar`'s `$derived` re-run when levels arrive after its own render.
let memberLevelsRevision = $state(0);
let memberLevelsLoaded = false;

/** @returns {number} */
export function getMemberLevelsRevision() {
  return memberLevelsRevision;
}

/** @returns {number} Number of authors currently known in the cache — for on-screen diagnostics. */
export function getMemberLevelsCount() {
  getMemberLevelsRevision();
  return memberLevels.size;
}

/** @param {string} value */
function normalizeName(value) {
  return String(value ?? '')
    // Skool display names sometimes carry decorative emoji/symbols (member badges, flair) that
    // differ between where a name is scraped (leaderboard vs a post's embedded author) — strip
    // anything that isn't a letter/number/space so "Daniel Cox 🔥" and "Daniel Cox" match.
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Coerce a candidate level-like value to a positive integer.
 * @param {unknown} value
 * @returns {number}
 */
function toLevel(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/**
 * @param {number} value
 * @returns {boolean}
 */
function isPlausibleLevel(value) {
  return Number.isInteger(value) && value > 0 && value < 200;
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/**
 * Resolve a fetch function, defaulting to the global fetch available in the browser.
 * @param {((input: string, init?: object) => Promise<Response>)} [fetchFn]
 * @returns {((input: string, init?: object) => Promise<Response>)}
 */
function resolveFetch(fetchFn) {
  const fn = fetchFn ?? /** @type {((input: string, init?: object) => Promise<Response>) | undefined} */ (globalThis.fetch);
  if (typeof fn !== 'function') {
    throw new Error('memberLevels: no fetch available');
  }
  return fn;
}

/**
 * Try to parse a JSON string; returns null on failure.
 * @param {string} text
 * @returns {unknown | null}
 */
function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Extract the embedded Next.js data blob from an HTML document.
 * @param {string} html
 * @returns {unknown | null}
 */
function parseNextDataFromHtml(html) {
  const match =
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html) ??
    /"__NEXT_DATA__"\s*:\s*(\{[\s\S]*\})/i.exec(html);
  if (!match) return null;
  const parsed = tryJson(match[1]);
  return parsed && typeof parsed === 'object' ? parsed : null;
}

/**
 * Pull a likely display name from a record.
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
function readName(record) {
  const directKeys = [
    'displayName',
    'display_name',
    'name',
    'fullName',
    'full_name',
    'title',
  ];
  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  const first =
    String(record.firstName ?? record.first_name ?? record.first ?? record.givenName ?? '').trim();
  const last =
    String(record.lastName ?? record.last_name ?? record.last ?? record.familyName ?? '').trim();
  const composed = `${first} ${last}`.trim();
  if (composed) return composed;

  for (const parent of ['author', 'user', 'member', 'profile', 'participant']) {
    const nested = record[parent];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const name = readName(/** @type {Record<string, unknown>} */ (nested));
      if (name) return name;
    }
  }
  return '';
}

/**
 * Pull a level-like value from a record.
 * @param {Record<string, unknown>} record
 * @returns {number}
 */
function readLevel(record) {
  const keys = [
    'level',
    'currentLevel',
    'memberLevel',
    'communityLevel',
    'skoolLevel',
    'rank',
    'tier',
  ];
  for (const key of keys) {
    const value = record[key];
    const n = toLevel(value);
    if (isPlausibleLevel(n)) return n;
  }

  for (const parent of ['author', 'user', 'member', 'profile', 'membership', 'groupMembership']) {
    const nested = record[parent];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const n = readLevel(/** @type {Record<string, unknown>} */ (nested));
      if (isPlausibleLevel(n)) return n;
    }
  }

  const packed = record.sp_data ?? record.spData;
  if (typeof packed === 'string' && packed.trim()) {
    const parsed = tryJson(packed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const packedLevel = toLevel(asRecord(parsed).lv ?? asRecord(parsed).level);
      if (isPlausibleLevel(packedLevel)) return packedLevel;
    }
  }

  return 0;
}

/**
 * Collect levels from a single record when it carries both a display name and a level.
 * @param {Record<string, unknown>} record
 * @param {Map<string, number>} found
 */
function collectRecord(record, found) {
  const name = readName(record);
  const level = readLevel(record);
  if (!name || level <= 0) return;
  const key = normalizeName(name);
  if (!key) return;
  const current = found.get(key) ?? 0;
  if (level > current) found.set(key, level);
}

/**
 * Recursively extract name -> level pairs from an arbitrary JSON value.
 * @param {unknown} source
 * @returns {Map<string, number>}
 */
export function extractLevels(source) {
  const found = new Map();
  const seen = new WeakSet();

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed) {
      const parsed =
        trimmed.startsWith('{') || trimmed.startsWith('[')
          ? tryJson(trimmed)
          : parseNextDataFromHtml(trimmed);
      if (parsed) {
        source = parsed;
      }
    }
  }

  /**
   * @param {unknown} value
   * @param {number} depth
   */
  function walk(value, depth) {
    if (depth <= 0 || value == null) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;
      const parsed = trimmed.startsWith('{') || trimmed.startsWith('[') ? tryJson(trimmed) : null;
      if (parsed) walk(parsed, depth - 1);
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, depth - 1);
      return;
    }

    if (typeof value !== 'object') return;
    const record = asRecord(value);
    if (seen.has(record)) return;
    seen.add(record);

    collectRecord(record, found);

    if ((record.sp_data || record.spData) && typeof (record.sp_data ?? record.spData) === 'string') {
      const parsed = tryJson(String(record.sp_data ?? record.spData));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const packed = asRecord(parsed);
        const name = readName(packed) || readName(record);
        const level = readLevel(packed);
        if (name && level > 0) {
          const key = normalizeName(name);
          if (key) {
            const current = found.get(key) ?? 0;
            if (level > current) found.set(key, level);
          }
        }
      }
    }

    for (const value of Object.values(record)) {
      walk(value, depth - 1);
    }
  }

  walk(source, 8);
  return found;
}

/**
 * Merge freshly scraped levels into the shared cache.
 * @param {unknown} source
 * @returns {number} The number of known members after the merge.
 */
export function ingestFeedLevels(source) {
  const found = extractLevels(source);
  console.info(`[skool-view] levels: ingest found ${found.size} new entr${found.size === 1 ? 'y' : 'ies'}`, [...found.keys()]);
  if (!found.size) return memberLevels.size;

  const next = new Map(memberLevels);
  for (const [name, level] of found) {
    const current = next.get(name) ?? 0;
    if (level > current) next.set(name, level);
  }
  memberLevels = next;
  memberLevelsRevision += 1;
  return memberLevels.size;
}

/**
 * Read a cached level for a display name.
 * @param {string} authorName
 * @returns {number}
 */
export function getMemberLevel(authorName) {
  const key = normalizeName(authorName);
  return key ? memberLevels.get(key) ?? 0 : 0;
}

/**
 * Safely parse a JSON response or HTML document and feed any discovered levels into the cache.
 * @param {Response} response
 * @returns {Promise<void>}
 */
async function ingestResponse(response) {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = tryJson(trimmed);
    if (parsed) {
      ingestFeedLevels(parsed);
      return;
    }
  }

  ingestFeedLevels(text);
  const nextData = parseNextDataFromHtml(text);
  if (nextData) ingestFeedLevels(nextData);
}

/**
 * Try a list of member/leaderboard surfaces until one fills the cache.
 * @param {object} args
 * @param {string} [args.slug] Community slug.
 * @param {string} [args.groupId] Skool group uuid.
 * @param {string} [args.buildId] Next.js build id.
 * @param {((input: string, init?: object) => Promise<Response>)} [args.fetchFn]
 * @returns {Promise<void>}
 */
export async function loadMemberLevels({ slug = '', groupId = '', buildId = '', fetchFn } = {}) {
  if (memberLevelsLoaded) return;
  memberLevelsLoaded = true; // set up front — this is a one-shot best-effort scrape, not a retry loop

  const fn = resolveFetch(fetchFn);
  const htmlUrls = ['leaderboard', '-/leaderboard', '-/leaderboards', 'members', '-/members'].map(
    (route) => `${pageUrl(slug)}/${route}`,
  );
  const jsonUrls = [
    membersUrl({ slug }),
    `${BASE}/${slug}/leaderboard.json`,
    `${BASE}/${slug}/-/leaderboard.json`,
    `${BASE}/${slug}/-/leaderboards.json`,
    `${BASE}/${slug}/members.json`,
    `${BASE}/${slug}/-/members.json`,
  ];
  if (buildId) {
    const nextDataRoot = `${BASE}/_next/data/${buildId}/${slug}`;
    jsonUrls.push(
      `${nextDataRoot}/leaderboard.json`,
      `${nextDataRoot}/-/leaderboard.json`,
      `${nextDataRoot}/-/leaderboards.json`,
      `${nextDataRoot}/members.json`,
      `${nextDataRoot}/-/members.json`,
    );
  }
  const api2Urls = groupId
    ? [`${API2_BASE}/groups/${groupId}/leaderboard`, `${API2_BASE}/groups/${groupId}/members`]
    : [];

  // Every candidate surface fires at once rather than one-at-a-time — with up to ~18 routes to
  // try (most communities only expose a couple of these), a sequential await chain could still be
  // running long after the feed has finished rendering several batches of posts. Concurrent
  // requests mean the cache is populated (and, via the revision counter, already-rendered avatars
  // updated) within one round-trip instead of eighteen.
  /**
   * @param {string} url
   * @param {'text/html' | 'application/json'} accept
   */
  const attempt = async (url, accept) => {
    try {
      const res = await fn(url, {
        headers: accept === 'application/json' ? { Accept: accept, 'content-type': accept } : { Accept: accept },
        credentials: 'include',
      });
      console.info(`[skool-view] levels: GET ${url} -> ${res.status}`);
      if (res.ok) await ingestResponse(res);
    } catch (err) {
      console.info(`[skool-view] levels: GET ${url} -> failed`, err);
    }
  };

  await Promise.allSettled([
    ...htmlUrls.map((url) => attempt(url, 'text/html')),
    ...jsonUrls.map((url) => attempt(url, 'application/json')),
    ...api2Urls.map((url) => attempt(url, 'application/json')),
  ]);

  console.info(`[skool-view] levels: ${memberLevels.size} member(s) known after scrape (groupId=${groupId || 'none'})`);
}

<script>
  // Left list pane. Renders the presented posts from the feed store (already category-filtered and
  // client-sorted), splits real pinned posts into a collapsible, separately-sortable "Pinned"
  // section, and grows a render WINDOW as the user scrolls. The whole corpus lives in the store
  // (crawled up front) — so "infinite scroll" is pure client-side windowing, not server paging:
  //   1. IntersectionObserver on a sentinel below the list grows the window on scroll.
  //   2. Fill-until-scrollable guard: after each window settles, if the list still does not
  //      overflow its pane and more rows remain, grow the window — repeat until it overflows or
  //      every row is shown. Fixes short/filtered lists that never scroll.
  // Switching sort/category re-derives instantly (no fetch) and resets the window to the top.
  //
  // A text search box replaces the pinned/unpinned list with a flat, unwindowed match list while
  // active — searching the full crawled corpus (title, body, author), not just the visible window.
  import PostRow from './PostRow.svelte';
  import CategorySelect from './CategorySelect.svelte';
  import SortSelect from './SortSelect.svelte';
  import { setActiveSearchQuery } from '../searchQuery.svelte.js';
  import { prefetchStats } from './statOverrides.svelte.js';

  /**
   * @typedef {object} Props
   * @property {ReturnType<typeof import('./feedStore.svelte.js').createFeedStore>} store
   * @property {Array<{ id: string, name: string }>} categories
   * @property {string | null} selectedId
   * @property {(id: string) => void} onSelect
   * @property {number} [listWidth] Pane width in px (resizable — owned by the parent).
   * @property {string} [buildId] Needed to prefetch accurate per-post stats.
   * @property {string} [slug] Needed to prefetch accurate per-post stats.
   */
  /** @type {Props} */
  let { store, categories, selectedId, onSelect, listWidth = 400, buildId = '', slug = '' } = $props();

  const INITIAL_WINDOW = 30;
  const WINDOW_STEP = 30;
  let windowSize = $state(INITIAL_WINDOW);

  /** @type {HTMLElement | undefined} */
  let paneEl = $state();
  /** @type {HTMLElement | undefined} */
  let listEl = $state();
  /** @type {HTMLElement | undefined} */
  let sentinelEl = $state();

  // Resolve a labelId to its display name for the row chip. The mapped post carries only
  // `labelId`; names live in the scraped category list.
  const categoryNameById = $derived(new Map(categories.map((c) => [c.id, c.name])));
  /** @param {import('../../skool/map.js').PostView} post */
  const nameFor = (post) => (post.labelId ? (categoryNameById.get(post.labelId) ?? '') : '');

  // Pinned = native Skool pin OR a local pin (store.isPinned unions both).
  const pinned = $derived(store.posts.filter((p) => store.isPinned(p)));
  let pinnedCollapsed = $state(true);
  let pinnedSort = $state('default');
  const sortedPinned = $derived.by(() => {
    const arr = [...pinned];
    if (pinnedSort === 'alpha') arr.sort((a, b) => a.title.localeCompare(b.title));
    if (pinnedSort === 'newest') arr.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    if (pinnedSort === 'oldest') arr.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
    return arr;
  });

  // ---- search: filters the FULL corpus (not just the visible window), replaces the whole list ----
  let searchQuery = $state('');
  $effect(() => { setActiveSearchQuery(searchQuery.trim()); });
  const isSearching = $derived(searchQuery.trim().length > 0);
  const searchResults = $derived.by(() => {
    if (!isSearching) return [];
    const q = searchQuery.trim().toLowerCase();
    return store.posts.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.contentText || '').toLowerCase().includes(q) ||
        (p.author?.name || '').toLowerCase().includes(q),
    );
  });

  const unpinned = $derived(store.posts.filter((p) => !store.isPinned(p)));
  const visibleUnpinned = $derived(unpinned.slice(0, windowSize));
  const hasMoreWindow = $derived(windowSize < unpinned.length);
  const total = $derived(store.posts.length);

  // ---- reset the window (and any active search) when the presented set changes shape ----
  // Read both so this re-runs on either change; jump back to the top so the new ordering starts
  // from row 1 rather than wherever the previous scroll left off.
  $effect(() => {
    void store.sort;
    void store.category;
    windowSize = INITIAL_WINDOW;
    searchQuery = '';
    if (paneEl) paneEl.scrollTop = 0;
  });

  // ---- fill-until-scrollable guard ----
  function growIfNeeded() {
    if (!listEl || !paneEl || !hasMoreWindow) return;
    requestAnimationFrame(() => {
      if (!listEl || !paneEl || !hasMoreWindow) return;
      if (listEl.scrollHeight <= paneEl.clientHeight) {
        windowSize += WINDOW_STEP;
      }
    });
  }

  // Re-run the guard whenever the visible count or load status changes (a window/page just settled).
  $effect(() => {
    void visibleUnpinned.length;
    void store.status;
    growIfNeeded();
  });

  // ---- scroll-triggered window growth ----
  $effect(() => {
    if (!sentinelEl || !paneEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreWindow) windowSize += WINDOW_STEP;
      },
      { root: paneEl, rootMargin: '200px' },
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  });

  // Kick off the crawl once on mount.
  $effect(() => {
    if (store.status === 'idle') void store.start();
  });

  // Fetch accurate like/comment counts for whatever's currently on screen (or matched by search)
  // — re-runs as the window grows on scroll, so newly-revealed rows get corrected too.
  $effect(() => {
    if (!buildId || !slug) return;
    const visible = isSearching
      ? searchResults
      : [...(pinnedCollapsed ? [] : sortedPinned), ...visibleUnpinned];
    if (visible.length) void prefetchStats(visible, buildId, slug, 30);
  });
</script>

<aside class="listpane" bind:this={paneEl} style={`width: ${listWidth}px; min-width: ${listWidth}px`}>
  <div class="listhead">
    <span class="sub">
      {#if store.isCrawling && total > 0}
        indexing {store.indexed}…
      {:else if total}
        {total} {total === 1 ? 'post' : 'posts'}
      {/if}
    </span>
    <div class="lh-controls">
      <CategorySelect
        {categories}
        value={store.category}
        onChange={(id) => store.setCategory(id)}
      />
      <SortSelect value={store.sort} onChange={(s) => store.setSort(s)} />
    </div>
    <div class="search-wrap">
      <input
        class="search-input"
        type="search"
        placeholder="Search posts…"
        aria-label="Search posts"
        bind:value={searchQuery}
      />
      {#if isSearching}
        <button class="search-clear" type="button" aria-label="Clear search" onclick={() => (searchQuery = '')}>
          ×
        </button>
      {/if}
    </div>
  </div>

  <div class="list" bind:this={listEl}>
    {#if store.status === 'error' && total === 0}
      <div class="empty">
        {store.error || "Couldn't load posts."}<br />
        <button class="btn sm" type="button" onclick={() => store.retry()}>Retry</button>
      </div>
    {:else if store.isInitialLoading}
      <div class="empty">Loading…</div>
    {:else if isSearching}
      <div class="listdiv">
        {searchResults.length === 0
          ? `No results for "${searchQuery.trim()}"`
          : `${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'} for "${searchQuery.trim()}"`}
      </div>
      {#each searchResults as post (post.id)}
        <PostRow
          {post}
          categoryName={nameFor(post)}
          selected={selectedId === post.id}
          pinned={store.isPinned(post)}
          nativePinned={post.pinned}
          {onSelect}
          onTogglePin={(id) => store.togglePin(id, post.pinned)}
        />
      {/each}
    {:else if total === 0}
      <div class="empty">No posts in this category yet.</div>
    {:else}
      {#if pinned.length}
        <div class="listdiv pinned-header">
          <button
            class="pinned-toggle"
            type="button"
            aria-expanded={!pinnedCollapsed}
            title={pinnedCollapsed ? 'Expand pinned' : 'Collapse pinned'}
            onclick={() => (pinnedCollapsed = !pinnedCollapsed)}
          >
            📌 Pinned ({pinned.length})
            <span class="pinned-chevron" class:collapsed={pinnedCollapsed}>▾</span>
          </button>
          {#if !pinnedCollapsed}
            <select
              class="pinned-sort-sel"
              title="Sort pinned posts"
              aria-label="Sort order for pinned posts"
              bind:value={pinnedSort}
            >
              <option value="default">Default order</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="alpha">A → Z</option>
            </select>
          {/if}
        </div>
        {#if !pinnedCollapsed}
          {#each sortedPinned as post (post.id)}
            <PostRow
              {post}
              categoryName={nameFor(post)}
              selected={selectedId === post.id}
              pinned={store.isPinned(post)}
              nativePinned={post.pinned}
              {onSelect}
              onTogglePin={(id) => store.togglePin(id, post.pinned)}
            />
          {/each}
        {/if}
        {#if visibleUnpinned.length}
          <div class="listdiv">All posts</div>
        {/if}
      {/if}
      {#each visibleUnpinned as post (post.id)}
        <PostRow
          {post}
          categoryName={nameFor(post)}
          selected={selectedId === post.id}
          pinned={store.isPinned(post)}
          nativePinned={post.pinned}
          {onSelect}
          onTogglePin={(id) => store.togglePin(id, post.pinned)}
        />
      {/each}
    {/if}
  </div>

  <div
    class="sentinel"
    class:show={(hasMoreWindow || store.isCrawling) && total > 0}
    bind:this={sentinelEl}
  >
    <span>{store.isCrawling ? 'Indexing more…' : 'Loading more…'}</span>
  </div>
</aside>

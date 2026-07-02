<script>
  // Right detail pane (§6 step 4a). Renders the SELECTED post from the already-mapped post
  // view-model the feed already holds — no new network call. Scope is POST rendering only:
  //   - header (avatar + name + date), category chip, title
  //   - body via {@html post.contentHtml} (already sanitized/escaped by markup.toHtml — safe)
  //   - action row: like + pin reflecting REAL state but inert (writes are step 5)
  //   - comments: the real comment list + its lazy api2 fetch live in CommentsSection (step 4b);
  //     this pane just hands it the post id, the group id, and the stored comment count.
  // When nothing is selected (or the post can't be found in the loaded stream) we keep the
  // "Select a post…" placeholder.
  import Avatar from './Avatar.svelte';
  import PostActions from './detail/PostActions.svelte';
  import CommentsSection from './detail/CommentsSection.svelte';
  import AttachmentList from './detail/AttachmentList.svelte';
  import { relativeTime } from './lib/format.js';
  import { toHtml } from '../skool/markup.js';
  import { getActiveSearchQuery } from './searchQuery.svelte.js';

  /**
   * @typedef {object} Props
   * @property {import('../skool/map.js').PostView | null} [post] The selected post view-model,
   *   or null when nothing is selected / the selection isn't in the loaded stream.
   * @property {string} [categoryName] Resolved category label for the chip, '' if none/unknown.
   *   (The view-model carries only `labelId`; names live in the scraped category list, resolved
   *   by App — same pattern the feed row uses.)
   * @property {string} [groupId] The community group's uuid, for the api2 comments read + writes.
   * @property {string} [slug] Community slug — used to build the canonical post URL for downloads.
   * @property {{ name: string, avatar: string }} [currentUser] The signed-in user (scraped from
   *   the page), shown as the optimistic author of comments/replies you write. May be undefined.
   * @property {(id: string) => (string | null)} [mentionHref] Resolve a user id to a profile URL.
   * @property {(id: string, handle: string) => void} [registerMention] Record a user id->handle.
   * @property {number} [refreshNonce] Bumped by a manual refresh to force a comments re-fetch.
   * @property {string} [highlightCommentId] A comment to scroll to + highlight (from a notification).
   * @property {boolean} [pinned] Shows as pinned (native OR local).
   * @property {boolean} [nativePinned] Pinned by Skool (read-only — toggle disabled).
   * @property {(id: string) => void} [onTogglePin] Toggle this post's local pin.
   */
  /** @type {Props} */
  let {
    post = null,
    categoryName = '',
    groupId = '',
    slug = '',
    currentUser,
    mentionHref,
    registerMention,
    refreshNonce = 0,
    highlightCommentId = '',
    pinned = false,
    nativePinned = false,
    onTogglePin,
  } = $props();

  /** @type {HTMLElement | undefined} */
  let bodyEl = $state();

  // Highlight matches of the active search query in the open post's rendered body. Strips any
  // previous marks first (post switch, query change, or query cleared), then re-wraps matches —
  // a text-node walk so it works over the sanitized HTML from `toHtml` (links, mentions) without
  // touching the markup.
  $effect(() => {
    void post?.id;
    const q = getActiveSearchQuery();
    if (!bodyEl) return;
    for (const mark of bodyEl.querySelectorAll('mark.sv-hl')) {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    }
    if (!q) return;
    const walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null);
    /** @type {Text[]} */
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(/** @type {Text} */ (n));
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    for (const tn of nodes) {
      const txt = tn.textContent || '';
      if (!re.test(txt)) {
        re.lastIndex = 0;
        continue;
      }
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      let mt;
      while ((mt = re.exec(txt)) !== null) {
        if (mt.index > last) frag.appendChild(document.createTextNode(txt.slice(last, mt.index)));
        const mk = document.createElement('mark');
        mk.className = 'sv-hl';
        mk.textContent = mt[0];
        frag.appendChild(mk);
        last = mt.index + mt[0].length;
        if (mt.index === re.lastIndex) re.lastIndex++;
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      tn.parentNode?.replaceChild(frag, tn);
    }
    // Jump to the first match so a search that matched deep in a long post doesn't leave the
    // reader scrolling to find it — mirrors the old behavior.
    requestAnimationFrame(() => {
      const first = bodyEl?.querySelector('mark.sv-hl');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // Loaded comments, mirrored from CommentsSection — the download action needs them without a
  // second fetch. Resets on post switch so a stale post's comments never leak into a new download.
  /** @type {import('../skool/map.js').CommentView[]} */
  let loadedComments = $state([]);
  /** @param {import('../skool/map.js').CommentView[]} comments */
  function handleCommentsChange(comments) {
    loadedComments = comments;
  }
  $effect(() => {
    void post?.id;
    loadedComments = [];
  });
</script>

<main class="detail">
  {#if !post}
    <div class="placeholder">Select a post to open it here →</div>
  {:else}
    <article class="dwrap">
      <div class="pmeta">
        <Avatar src={post.author.avatar} level={post.author.level} authorName={post.author.name} size="md" />
        <div>
          <div class="who">{post.author.name}</div>
          <div class="when">{relativeTime(post.created)}</div>
        </div>
      </div>

      <h1>{post.title}</h1>

      {#if categoryName}
        <div class="dcat"><span class="catchip">{categoryName}</span></div>
      {/if}

      <!-- toHtml(content) with mention links resolved — already HTML-escaped/sanitized. -->
      <div class="dbody" bind:this={bodyEl}>{@html toHtml(post.content, { mentionHref })}</div>

      <AttachmentList items={post.attachments ?? []} />

      <PostActions
        postId={post.id}
        upvotes={post.upvotes}
        {pinned}
        {nativePinned}
        {onTogglePin}
        {post}
        comments={loadedComments}
        {categoryName}
        {slug}
      />

      <CommentsSection
        postId={post.id}
        {groupId}
        count={post.comments}
        {currentUser}
        {mentionHref}
        {registerMention}
        {refreshNonce}
        {highlightCommentId}
        onCommentsChange={handleCommentsChange}
      />
    </article>
  {/if}
</main>

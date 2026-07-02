<script>
  // A single feed list row: pin TOGGLE, title, a short body preview, category chip, author avatar
  // + name + relative age + thumb-icon likes + 💬comments. Clicking the row opens the post;
  // clicking the pin toggles a LOCAL pin (client-side only — see skool/pins.js) without opening
  // the post. Natively-pinned posts show the pin lit + disabled: Skool pins are read-only, we
  // never unpin them.
  //
  // The like count uses the same `Thumb` SVG as the post/comment action rows (inherits
  // `currentColor`, themeable) rather than the 👍 emoji, which renders in a fixed platform color
  // that CSS can't touch.
  import Avatar from '../Avatar.svelte';
  import Thumb from '../detail/Thumb.svelte';
  import { relativeTime, compactCount } from '../lib/format.js';
  import { getStatOverride } from './statOverrides.svelte.js';

  /**
   * @typedef {object} Props
   * @property {import('../../skool/map.js').PostView} post
   * @property {string} categoryName Resolved category label, or '' if none/unknown.
   * @property {boolean} selected
   * @property {boolean} pinned Shows as pinned (native OR local).
   * @property {boolean} nativePinned Pinned by Skool (read-only — toggle disabled).
   * @property {(id: string) => void} onSelect
   * @property {(id: string) => void} onTogglePin
   */
  /** @type {Props} */
  let { post, categoryName, selected, pinned, nativePinned, onSelect, onTogglePin } = $props();

  const preview = $derived.by(() => {
    const txt = (post.contentText || '').trim();
    return txt.length > 110 ? `${txt.slice(0, 110)}…` : txt;
  });

  // The feed-listing payload's upvotes/comments are a metadata snapshot that can lag behind
  // reality; prefer the override once the background prefetch (statOverrides.svelte.js) has
  // fetched the real counts for this post.
  const displayUpvotes = $derived(getStatOverride(post.id)?.upvotes ?? post.upvotes);
  const displayComments = $derived(getStatOverride(post.id)?.comments ?? post.comments);

  /** True when an event originated on the pin button (so the row ignores it). */
  const fromPin = (/** @type {Event} */ e) =>
    e.target instanceof Element && e.target.closest('.pinbtn') != null;
</script>

<div
  class="row"
  class:selected
  role="button"
  tabindex="0"
  aria-label={`Open post: ${post.title}`}
  aria-current={selected ? 'true' : undefined}
  onclick={(e) => {
    if (fromPin(e)) return;
    onSelect(post.id);
  }}
  onkeydown={(e) => {
    if (fromPin(e)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(post.id);
    }
  }}
>
  <button
    class="pinbtn"
    class:on={pinned}
    type="button"
    disabled={nativePinned}
    aria-pressed={pinned}
    title={nativePinned ? 'Pinned by Skool' : pinned ? 'Unpin (local)' : 'Pin (local)'}
    aria-label={nativePinned
      ? 'Pinned by Skool'
      : `${pinned ? 'Unpin' : 'Pin'} post (local)`}
    onclick={(e) => {
      e.stopPropagation();
      onTogglePin(post.id);
    }}
  >
    📌
  </button>
  <div class="rmain">
    <div class="rtitle">{post.title}</div>
    {#if preview}
      <p class="rprev">{preview}</p>
    {/if}
    {#if categoryName}
      <div class="rcat"><span class="catchip">{categoryName}</span></div>
    {/if}
    <div class="rmeta">
      <Avatar src={post.author.avatar} level={post.author.level} authorName={post.author.name} size="xs" />
      <span class="rname">{post.author.name}</span>
      <span class="rstat"
        >· {relativeTime(post.created)} · <Thumb />{compactCount(displayUpvotes)} · 💬{compactCount(
          displayComments,
        )}</span
      >
    </div>
  </div>
</div>

<script>
  // Author avatar with a graceful fallback to an empty tinted circle when there's no image
  // (or the image fails to load). `size` maps to the prototype's avatar size classes. An optional
  // member-level badge pins to the bottom-right corner when `level` is known. When the direct
  // level is absent, we fall back to the shared member-level cache by `authorName`.
  import { getMemberLevel, getMemberLevelsRevision } from './memberLevels.svelte.js';

  /**
   * @typedef {object} Props
   * @property {string} [src] Image URL; empty/missing renders the fallback circle.
   * @property {'xs' | 'sm' | 'md'} [size]
   * @property {number} [level] Member level, shown as a small badge. 0/absent hides the badge.
   * @property {string} [authorName] Display name used to look up a cached member level.
   */
  /** @type {Props} */
  let { src = '', size = 'md', level = 0, authorName = '' } = $props();

  let failed = $state(false);
  const sizeClass = { xs: 'avatar xs', sm: 'avatar sm', md: 'avatar' };
  const sizePx = { xs: 28, sm: 30, md: 40 };
  const wrapStyle = $derived.by(() => {
    getMemberLevelsRevision();
    const px = sizePx[size] ?? 40;
    return `position:relative;flex:none;display:inline-block;width:${px}px;height:${px}px;overflow:visible;`;
  });
  const badgeStyle = $derived.by(() => {
    getMemberLevelsRevision();
    const px = sizePx[size] ?? 40;
    return `position:absolute;min-width:14px;height:14px;padding:0 3px;box-sizing:border-box;border-radius:999px;background:#1d6ce0;color:#fff;font-size:9px;font-weight:700;line-height:14px;text-align:center;pointer-events:none;z-index:2;top:${px - 11}px;left:${px - 10}px;bottom:auto;right:auto;`;
  });
  const displayLevel = $derived.by(() => {
    getMemberLevelsRevision();
    return level > 0 ? level : getMemberLevel(authorName);
  });
</script>

<div class="avatar-wrap" style={wrapStyle}>
  {#if src && !failed}
    <img
      class={sizeClass[size]}
      {src}
      alt=""
      loading="lazy"
      onerror={() => (failed = true)}
    />
  {:else}
    <div class={sizeClass[size]} aria-hidden="true"></div>
  {/if}
  <span class="level-badge" style={badgeStyle} hidden={displayLevel <= 0}>{displayLevel}</span>
</div>

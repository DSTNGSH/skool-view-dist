<script>
  // Author avatar with a graceful fallback to an empty tinted circle when there's no image
  // (or the image fails to load). `size` maps to the prototype's avatar size classes. An optional
  // `level` renders a small blue member-level badge over the bottom-right corner (F2).
  /**
   * @typedef {object} Props
   * @property {string} [src] Image URL; empty/missing renders the fallback circle.
   * @property {'xs' | 'sm' | 'md'} [size]
   * @property {number} [level] Member level → badge overlay. Omit / 0 = no badge.
   */
  /** @type {Props} */
  let { src = '', size = 'md', level } = $props();

  let failed = $state(false);
  const sizeClass = { xs: 'avatar xs', sm: 'avatar sm', md: 'avatar' };
</script>

<span class="av-wrap">
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
  {#if level}
    <span class="level-badge">{level}</span>
  {/if}
</span>

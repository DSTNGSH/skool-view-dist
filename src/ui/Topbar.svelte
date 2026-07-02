<script>
  // Overlay top bar: "← Back to Skool" exit, brand + community name, the single "Feed" tab, then a
  // right cluster — manual REFRESH, a disabled chat placeholder (v2), the notifications bell
  // (+ unread badge + dropdown panel), and the theme selector — chat-then-bell order matches
  // native Skool's own topbar. Clicking a notification deep-links to native Skool (see
  // NotificationPanel). No yellow new-post banner (spec §4/§5).
  import ThemeSelect from './ThemeSelect.svelte';
  import NotificationPanel from './NotificationPanel.svelte';

  /** @typedef {import('../skool/map.js').NotificationView} NotificationView */

  /**
   * @typedef {object} Props
   * @property {string} groupName Community display name for the brand area.
   * @property {string} [groupIcon] Community logo URL — replaces the ▣ glyph when present.
   * @property {import('./theme.js').ThemeId} theme
   * @property {(theme: import('./theme.js').ThemeId) => void} onThemeChange
   * @property {() => void} onExit Toggles the overlay off (content-script toggle).
   * @property {() => void} [onRefresh] Reload the feed (and the open post's comments).
   * @property {NotificationView[]} [notifItems]
   * @property {'idle' | 'loading' | 'ready' | 'error'} [notifStatus]
   * @property {boolean} [notifHasMore]
   * @property {number} [unreadCount]
   * @property {() => void} [onOpenNotifications] Called on the bell's first open (empty list only —
   *   later opens reuse what's already loaded).
   * @property {() => void} [onLoadMoreNotifications] Append the next page of notifications.
   * @property {(n: NotificationView) => void} [onOpenNotification] Open a notification's target post.
   * @property {(n: NotificationView) => void} [onToggleNotification] Toggle one notification's read state.
   * @property {() => void} [onMarkAllReadNotifications]
   */
  /** @type {Props} */
  let {
    groupName,
    groupIcon = '',
    theme,
    onThemeChange,
    onExit,
    onRefresh,
    notifItems = [],
    notifStatus = 'idle',
    notifHasMore = false,
    unreadCount = 0,
    onOpenNotifications,
    onLoadMoreNotifications,
    onOpenNotification,
    onToggleNotification,
    onMarkAllReadNotifications,
  } = $props();

  let notifOpen = $state(false);
  /** @type {HTMLElement | undefined} */
  let notifWrapEl = $state();

  function toggleNotif() {
    notifOpen = !notifOpen;
    // Fetch only on the first open (empty list) — reopening keeps whatever's already loaded, the
    // same way the refresh button and a manual "Load more" are the only other triggers.
    if (notifOpen && notifItems.length === 0) onOpenNotifications?.();
  }

  // Close the panel on a click anywhere outside it — not just the explicit × button.
  $effect(() => {
    if (!notifOpen) return;
    /** @param {MouseEvent} e */
    const onOutside = (e) => {
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
      if (notifWrapEl && !path.includes(notifWrapEl)) notifOpen = false;
    };
    document.addEventListener('click', onOutside, true);
    return () => document.removeEventListener('click', onOutside, true);
  });
</script>

<header class="topbar">
  <div class="topbar-left">
    <button
      class="iconbtn exitbtn"
      type="button"
      aria-label="Back to Skool — return to the native view"
      title="Return to native Skool — the toolbar icon (Alt+S) reopens this view"
      onclick={onExit}
    >
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
      </svg>
    </button>
    <div class="brand">
      <span class="brand-mark">
        {#if groupIcon}
          <img class="group-icon" src={groupIcon} alt={groupName} />
        {:else}
          ▣
        {/if}
      </span>
      <span>{groupName}</span>
    </div>
  </div>

  <nav class="tabs" aria-label="Views">
    <button type="button" class="active" aria-current="page">Feed</button>
  </nav>

  <div class="topbar-right">
    <button
      class="iconbtn"
      type="button"
      aria-label="Refresh feed"
      title="Refresh — reload posts and comments"
      onclick={onRefresh}
    >
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.15.69 4.24 1.78L13 11h7V4z"
        />
      </svg>
    </button>

    <button
      class="iconbtn"
      type="button"
      disabled
      aria-label="Chat — coming in a later version"
      title="Chat — coming soon"
    >
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="4" />
        <path d="M8.5 17l-1.5 3 4-2.4" />
      </svg>
    </button>

    <div class="notif-wrap" bind:this={notifWrapEl}>
      <button
        class="iconbtn"
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={notifOpen}
        title="Notifications"
        onclick={toggleNotif}
      >
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {#if unreadCount > 0}
          <span class="notif-badge">{unreadCount}</span>
        {/if}
      </button>
      {#if notifOpen}
        <NotificationPanel
          items={notifItems}
          status={notifStatus}
          hasMore={notifHasMore}
          onLoadMore={onLoadMoreNotifications}
          onOpen={(n) => {
            notifOpen = false;
            onOpenNotification?.(n);
          }}
          onToggle={onToggleNotification}
          onMarkAllRead={onMarkAllReadNotifications}
          onClose={() => (notifOpen = false)}
        />
      {/if}
    </div>

    <ThemeSelect value={theme} onChange={onThemeChange} />
  </div>
</header>

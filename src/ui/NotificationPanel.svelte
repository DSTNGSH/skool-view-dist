<script>
  // Notifications dropdown panel (§6). Renders recent notification view-models with loading / empty
  // / error states and a "Load more" button (cursor paging, like native Skool). Each row is an <a>
  // that deep-links to the NATIVE Skool view of its target — v1 does NOT custom-render notification
  // targets (spec §4/§5), and there is no yellow new-post banner. Data is owned by App; this is
  // presentational. To avoid a flash, the loading/error placeholders only show when the list is
  // empty — a refresh/load-more keeps the existing items visible.
  import Avatar from './Avatar.svelte';
  import { commentTime } from './lib/format.js';

  /** @typedef {import('../skool/map.js').NotificationView} NotificationView */

  /**
   * @typedef {object} Props
   * @property {NotificationView[]} [items]
   * @property {'idle' | 'loading' | 'ready' | 'error'} [status]
   * @property {boolean} [hasMore]
   * @property {() => void} [onLoadMore]
   * @property {(n: NotificationView) => void} [onOpen] Open the target post in the viewer.
   * @property {(n: NotificationView) => void} [onToggleRead] Toggle one notification's read state.
   * @property {() => void} [onMarkAll] Mark every notification read.
   * @property {() => void} [onClose]
   */
  /** @type {Props} */
  let { items = [], status = 'idle', hasMore = false, onLoadMore, onOpen, onToggleRead, onMarkAll, onClose } = $props();

  const anyUnread = $derived(items.some((n) => n.unread));

  /**
   * A plain left-click opens the target in the viewer; ⌘/Ctrl/Shift/Alt or middle-click fall
   * through to the browser so the `href` opens the native Skool view (new tab).
   * @param {MouseEvent} e
   * @param {NotificationView} n
   */
  function handleClick(e, n) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onOpen?.(n);
  }
</script>

<div class="notif-panel" role="dialog" aria-label="Notifications">
  <div class="notif-head">
    <span>Notifications</span>
    <span style="display:flex; gap:10px; align-items:center;">
      {#if anyUnread}
        <button class="np-markall" type="button" onclick={onMarkAll}>Mark all as read</button>
      {/if}
      <button class="iconbtn notif-close" type="button" aria-label="Close notifications" onclick={onClose}>×</button>
    </span>
  </div>
  <div class="notif-list">
    {#if status === 'loading' && items.length === 0}
      <div class="notif-empty">Loading…</div>
    {:else if status === 'error' && items.length === 0}
      <div class="notif-empty">Couldn’t load notifications. Try again.</div>
    {:else if items.length === 0}
      <div class="notif-empty">You’re all caught up.</div>
    {:else}
      {#each items as n (n.id)}
        <div class="notif-item" class:unread={n.unread}>
          <a class="notif-link" href={n.href} onclick={(e) => handleClick(e, n)}>
            <Avatar src={n.actorAvatar} size="sm" />
            <div class="notif-body">
              <div class="notif-text"><strong>{n.actorName}</strong> {n.text}</div>
              {#if n.preview}<div class="notif-preview">{n.preview}</div>{/if}
              <div class="notif-time">{commentTime(n.ts)}</div>
            </div>
          </a>
          <button
            class="notif-dot"
            type="button"
            title={n.unread ? 'Mark as read' : 'Mark as unread'}
            aria-label={n.unread ? 'Mark as read' : 'Mark as unread'}
            onclick={() => onToggleRead?.(n)}
          ></button>
        </div>
      {/each}
      {#if hasMore}
        <button
          class="btn sm notif-more"
          type="button"
          disabled={status === 'loading'}
          onclick={onLoadMore}
        >
          {status === 'loading' ? 'Loading…' : 'Load more'}
        </button>
      {/if}
    {/if}
  </div>
</div>

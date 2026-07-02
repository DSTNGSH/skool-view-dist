# Changelog

All notable changes to skool-view.

## Deze fork

Wijzigingen bovenop onderstaande upstream-basis (tel-systeem, zoom, Markdown-download, zoekfunctie,
composer-vormgeving, bugfixes) staan niet hier, maar in de workspace-logboeken:
`Kennis/Logboeken/Scripts/Html/Geheugenlogboek_Weergeven_Skool_ChromeExtensie/`. Dat is de primaire
bron — hier dupliceren zou uit sync raken.

## 0.3.2 — 2026-07-02 (upstream)

### New
- **Recent Activity sort** — now the default; orders posts by their latest comment or edit, matching
  Skool's own default feed order. (Newest / Oldest / Most Liked / Most Commented / Hidden Gems remain.)
- **Member level badges** on avatars, in both the feed and comments.
- **Community logo** shown in the top bar.
- **Relative timestamps** in the list (`2h`, `3d`), switching to a full date after 5 days.
- **Card layout** — posts, the detail pane, and comments are now cards, with a 2-line preview of each
  post in the list.
- **Collapsible Pinned section**.
- **Resizable post list** — drag the divider between the list and the open post.
- **Zoom control** (bottom-right) to scale the view up or down.
- **Notification management** — mark a notification read/unread, "Mark all as read", an exact unread
  count, and click outside the panel to close it.

### Improved & fixed
- **Local pins now persist across reloads** (they were being dropped on refresh).
- **Refresh reflects server-side changes** — e.g. a post un-pinned by an admin now leaves the Pinned
  section when you refresh.
- **Escape** closes the overlay (and closes an open image preview or menu first); **browser Back**
  closes it; a **page reload** now starts with the overlay closed.
- **Toggle shortcut** is now **Alt+Shift+C** (rebindable in your browser's extension-shortcuts settings).

### Distribution
- Now available as an **unlisted Chrome Web Store** item (signed, auto-updating) alongside Firefox.

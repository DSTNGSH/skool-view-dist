// Generates a Markdown file from a PostView + its loaded comments and triggers a browser download.

/**
 * @param {object} opts
 * @param {import('../../skool/map.js').PostView} opts.post
 * @param {import('../../skool/map.js').CommentView[]} [opts.comments]
 * @param {string} [opts.categoryName]
 * @param {string} [opts.slug] Community slug — used to build the canonical post URL.
 */
export async function downloadPostAsMarkdown({ post, comments = [], categoryName = '', slug = '' }) {
  const now = new Date();

  function pad2(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()); }
  function ts(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  const postDateStr = post.created ? ymd(new Date(post.created)) : '';
  const safeTitle = post.title.replace(/[<>:"\/\\|?*]/g, '').replace(/\s+/g, '_').slice(0, 60);
  const filename = ymd(now) + '_skool_' + safeTitle + (postDateStr ? '_[' + postDateStr + ']' : '') + '.md';

  const postUrl = (slug && post.slug)
    ? 'https://www.skool.com/' + slug + '/' + post.slug
    : window.location.href;

  let md = '# ' + post.title + '\n\n'
    + '> Template-versie: 1.0\n\n'
    + '| Veld | Waarde |\n'
    + '|:---|:---|\n'
    + '| Platform | skool.com |\n'
    + '| Auteur | ' + (post.author?.name || '—') + ' |\n'
    + '| Categorie | ' + (categoryName || '—') + ' |\n'
    + '| Datum post | ' + (post.created ? post.created.slice(0, 10) : '—') + ' |\n'
    + '| Opgeslagen | ' + ts(now) + ' |\n'
    + '| URL | ' + postUrl + ' |\n\n'
    + '---\n\n'
    + '## Post\n\n'
    + (post.contentText || post.content || '') + '\n';

  if (comments.length > 0) {
    md += '\n\n---\n\n## Reacties (' + comments.length + ')\n\n';
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      const cDate = c.ts ? c.ts.slice(0, 10) : '';
      md += '### Reactie ' + (i + 1) + ' — ' + (c.author?.name || '') +
        (cDate ? ' (' + cDate + ')' : '') + '\n\n' +
        (c.contentText || c.content || '') + '\n\n';
      if (c.replies && c.replies.length > 0) {
        for (const r of c.replies) {
          md += '> **' + (r.author?.name || '') + ':** ' + (r.contentText || r.content || '') + '\n\n';
        }
      }
    }
  }

  const result = await chrome.runtime.sendMessage({
    type: 'skool-view:download',
    filename,
    markdown: md
  });
  if (!result?.ok) {
    console.warn('[skool-view] download via background failed', result?.error);
  }
}

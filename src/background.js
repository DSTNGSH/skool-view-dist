import browser from 'webextension-polyfill';

// Background service worker (Firefox: background script).
// Responsibility: own the per-tab on/off state and tell the content script to toggle.
// State lives in storage.session keyed by tab id, so it survives content-script reloads
// (Skool SPA navigations) but clears when the browser session ends.

const STATE_PREFIX = 'overlay-state:';

/** @param {number} tabId */
function stateKey(tabId) {
  return `${STATE_PREFIX}${tabId}`;
}

/**
 * @param {number} tabId
 * @returns {Promise<boolean>}
 */
async function readTabState(tabId) {
  const key = stateKey(tabId);
  const stored = await browser.storage.session.get(key);
  return stored[key] === true;
}

/**
 * @param {number} tabId
 * @param {boolean} isOn
 */
async function writeTabState(tabId, isOn) {
  await browser.storage.session.set({ [stateKey(tabId)]: isOn });
}

// Flip the stored state for a tab and push the new state to its content script.
/** @param {number} tabId */
async function toggleTab(tabId) {
  if (typeof tabId !== 'number') return;
  const next = !(await readTabState(tabId));
  await writeTabState(tabId, next);
  try {
    await browser.tabs.sendMessage(tabId, { type: 'skool-view:set-overlay', on: next });
  } catch {
    // No content script on this tab (not a skool.com page, or not yet injected).
    // The stored state still applies when a content script later asks for it.
  }
}

// Toolbar button.
browser.action.onClicked.addListener((tab) => {
  if (tab?.id != null) void toggleTab(tab.id);
});

// Alt+S keyboard command.
browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle') return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) void toggleTab(tab.id);
});

browser.runtime.onMessage.addListener(
  (
    /** @type {unknown} */ message,
    /** @type {import('webextension-polyfill').Runtime.MessageSender} */ sender,
  ) => {
    const msg = /** @type {{ type?: string }} */ (message);
    const tabId = sender.tab?.id;

    // A content script (re)loaded and is asking for its tab's current state.
    if (msg?.type === 'skool-view:get-overlay') {
      if (typeof tabId !== 'number') return Promise.resolve({ on: false });
      return readTabState(tabId).then((on) => ({ on }));
    }

    // The in-overlay "Back to Skool" button asked to flip this tab.
    if (msg?.type === 'skool-view:request-toggle') {
      if (typeof tabId === 'number') void toggleTab(tabId);
      return undefined;
    }

    // The content script wants the AWS-WAF token. Its value is the `aws-waf-token` cookie,
    // which may be httpOnly (so it is NOT visible in document.cookie). The background has the
    // `cookies` permission + skool.com host access, so it can read it via browser.cookies.get.
    // Needed for the api2 comments read (and step-5 writes), which send it as the
    // `x-aws-waf-token` header.
    // The in-overlay "Download" button asked to save a post as Markdown. Runs from the
    // background (not the content script) because `downloads.download` needs the `downloads`
    // permission, which is only granted here. `conflictAction: 'uniquify'` avoids clobbering an
    // earlier download of the same post; the fixed "Skool/" subfolder lets a local directory
    // junction route saves straight into the archive inbox without a save-as prompt.
    if (msg?.type === 'skool-view:download') {
      const { filename, markdown } = /** @type {{ filename: string, markdown: string }} */ (message);
      const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
      const subfolder = 'Skool';
      return browser.downloads
        .download({ url: dataUrl, filename: subfolder + '/' + filename, conflictAction: 'uniquify' })
        .then(() => ({ ok: true }))
        .catch((err) => ({ ok: false, error: String(err) }));
    }

    if (msg?.type === 'skool-view:get-waf-token') {
      return browser.cookies
        .get({ url: 'https://www.skool.com', name: 'aws-waf-token' })
        .then((cookie) => ({ token: cookie?.value ?? '' }))
        .catch(() => ({ token: '' }));
    }

    return undefined;
  },
);

// Clean up state when a tab closes.
browser.tabs.onRemoved.addListener((tabId) => {
  void browser.storage.session.remove(stateKey(tabId));
});

// A real navigation committed (reload, typed URL, external link) — as opposed to Skool's own SPA
// route changes, which use history.pushState and fire onHistoryStateUpdated instead, never this
// event. Reset the tab to off so every real page load starts from Skool's own page (matches the
// manifest's "off by default"), while toggling the overlay on still survives Skool's internal
// in-app navigation.
browser.webNavigation.onCommitted.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    void writeTabState(details.tabId, false);
  },
  { url: [{ hostSuffix: 'skool.com' }] },
);

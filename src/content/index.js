import browser from 'webextension-polyfill';
import { mount, unmount } from 'svelte';
import App from '../ui/App.svelte';
// Overlay CSS imported as a raw string so we can inject it into the shadow root.
// A head-injected <style> tag would NOT cross the shadow boundary.
import overlayCss from '../ui/overlay.css?inline';
import { installCapture } from '../skool/capture.js';

// TEMP — capture build only (`npm run build:capture`, MODE === 'capture'); the guarded call is
// tree-shaken out of normal firefox/chrome builds. Logs Skool API calls to the PAGE console,
// dumping FULL JSON for the endpoints we still need to confirm: /users/{id}/preview (F2 level) and
// /messages/{id} (F9 mark-read). Remove this block + the import once C1/C2 are captured.
// @ts-ignore — import.meta.env.MODE is a Vite build-time constant (not typed in jsconfig).
if (import.meta.env.MODE === 'capture') {
  installCapture({ verboseFor: /\/(users|messages)\//i });
}

// Content script. Responsibility: mount/unmount the overlay into an open Shadow DOM,
// keep the host node alive against Skool's SPA, and obey toggle messages + initial state.

const HOST_ID = 'skool-view-host';

/** @type {HTMLElement | null} */
let hostElement = null;
/** @type {ShadowRoot | null} */
let shadowRoot = null;
/** @type {ReturnType<typeof mount> | null} */
let appInstance = null;
/** @type {MutationObserver | null} */
let bodyObserver = null;

let overlayOn = false;

// Build the host + open shadow root, inject CSS, and mount the empty Svelte app.
function mountOverlay() {
  if (hostElement) return;

  hostElement = document.createElement('div');
  hostElement.id = HOST_ID;
  // Keep the host above Skool's UI without leaking styles to the page.
  hostElement.style.position = 'fixed';
  hostElement.style.inset = '0';
  hostElement.style.zIndex = '2147483647';

  shadowRoot = hostElement.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = overlayCss;
  shadowRoot.appendChild(style);

  const appRoot = document.createElement('div');
  shadowRoot.appendChild(appRoot);

  document.body.appendChild(hostElement);

  appInstance = mount(App, {
    target: appRoot,
    props: {
      // The "Back to Skool" button calls this to dismiss the overlay (routes through
      // the background so per-tab state stays correct).
      onClose: requestToggleOff,
    },
  });

  observeBody();
}

// Tear down the app, the shadow host, and the observer.
function unmountOverlay() {
  stopObservingBody();
  if (appInstance) {
    unmount(appInstance);
    appInstance = null;
  }
  if (hostElement?.parentNode) {
    hostElement.parentNode.removeChild(hostElement);
  }
  hostElement = null;
  shadowRoot = null;
}

// Re-assert the host if Skool's SPA strips it from <body> while the overlay is active.
function observeBody() {
  if (bodyObserver) return;
  bodyObserver = new MutationObserver(() => {
    if (overlayOn && hostElement && !document.body.contains(hostElement)) {
      document.body.appendChild(hostElement);
    }
  });
  bodyObserver.observe(document.body, { childList: true });
}

function stopObservingBody() {
  if (bodyObserver) {
    bodyObserver.disconnect();
    bodyObserver = null;
  }
}

// Apply a desired on/off state idempotently.
/** @param {boolean} on */
function setOverlay(on) {
  overlayOn = on;
  if (on) mountOverlay();
  else unmountOverlay();
}

// Ask the background to flip this tab off (keeps storage.session authoritative).
function requestToggleOff() {
  void browser.runtime.sendMessage({ type: 'skool-view:request-toggle' });
}

// Toggle messages pushed from the background (toolbar click / Alt+S).
browser.runtime.onMessage.addListener((/** @type {unknown} */ message) => {
  const msg = /** @type {{ type?: string, on?: boolean }} */ (message);
  if (msg?.type === 'skool-view:set-overlay') {
    setOverlay(msg.on === true);
  }
  return undefined;
});

// F10 — Escape closes the overlay, but YIELDS to an open lightbox / mention dropdown inside it
// (those own Escape first). We check the shadow DOM for them rather than racing keydown listeners,
// so the first Escape closes the inner thing (via its own handler) and the next closes the overlay.
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !overlayOn || e.defaultPrevented) return;
  if (shadowRoot?.querySelector('.lightbox, .mb-list')) return;
  requestToggleOff();
});

// F10 — browser back/forward dismisses the overlay so it doesn't strand over a newly-navigated page.
window.addEventListener('popstate', () => {
  if (overlayOn) requestToggleOff();
});

// On (re)load the overlay always starts CLOSED (F10) — even if this tab had it open before the
// reload. If the background still thinks this tab is on, flip its stored state off so a later
// toolbar toggle (Alt+Shift+C) opens fresh rather than "closing" an already-hidden overlay.
async function restoreInitialState() {
  setOverlay(false);
  try {
    const reply = /** @type {{ on?: boolean }} */ (
      await browser.runtime.sendMessage({ type: 'skool-view:get-overlay' })
    );
    if (reply?.on === true) requestToggleOff();
  } catch {
    // Background not ready — already closed.
  }
}

void restoreInitialState();

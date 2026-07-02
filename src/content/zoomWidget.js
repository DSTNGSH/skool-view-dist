// Floating page-zoom + fullscreen widget. Lives OUTSIDE the shadow host (appended straight to
// document.body) so it never scales along with `host.style.zoom`, and outside Svelte entirely —
// it's page chrome the content script owns, not overlay UI. Mount/unmount is tied 1:1 to the
// overlay host's own lifecycle (see content/index.js).

const ZOOM_KEY = 'sv-zoom';
const ZOOM_MIN = 70;
const ZOOM_MAX = 150;

/** @type {HTMLElement | null} */
let zoomFloat = null;
/** @type {(() => void) | null} */
let fullscreenHandler = null;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let zoomLabelTimer;

function currentZoom() {
  return Number(localStorage.getItem(ZOOM_KEY)) || 100;
}

/** @param {HTMLElement} host The `#skool-view-host` element — zoom is applied to it, not the page. */
function applyZoom(host) {
  const zoom = currentZoom();
  host.style.zoom = zoom === 100 ? '' : `${zoom}%`;
  const label = document.getElementById('sv-zoom-float-label');
  if (label) label.textContent = `${zoom}%`;
}

/**
 * @param {number} delta
 * @param {HTMLElement} host
 */
function changeZoom(delta, host) {
  const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom() + delta));
  localStorage.setItem(ZOOM_KEY, String(next));
  applyZoom(host);
}

/** @param {HTMLElement} host The `#skool-view-host` element to zoom. */
export function mountZoomWidget(host) {
  if (zoomFloat) return;
  applyZoom(host);

  zoomFloat = document.createElement('div');
  zoomFloat.id = 'sv-zoom-float';
  zoomFloat.style.cssText =
    'position:fixed;bottom:16px;right:32px;z-index:2147483648;display:flex;flex-direction:column;' +
    'align-items:center;padding:4px 0;background:#fff;border:1px solid #d0d0d0;border-radius:8px;' +
    'box-shadow:0 2px 8px rgba(0,0,0,0.2);overflow:visible;user-select:none;font-family:system-ui,sans-serif;';

  // Percentage tooltip — briefly shown next to the widget on click.
  const zoomLabelEl = document.createElement('span');
  zoomLabelEl.id = 'sv-zoom-float-label';
  zoomLabelEl.style.cssText =
    'position:absolute;right:44px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.75);' +
    'color:#fff;font-size:12px;padding:3px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;' +
    'opacity:0;transition:opacity 0.15s;';
  zoomLabelEl.textContent = `${currentZoom()}%`;
  zoomFloat.appendChild(zoomLabelEl);

  const showZoomLabel = () => {
    zoomLabelEl.style.opacity = '1';
    clearTimeout(zoomLabelTimer);
    zoomLabelTimer = setTimeout(() => {
      zoomLabelEl.style.opacity = '0';
    }, 1500);
  };

  const mkDivider = () => {
    const d = document.createElement('div');
    d.style.cssText = 'width:24px;height:1px;background:#d0d0d0;flex:none;';
    return d;
  };

  /** @param {string} label @param {number} delta */
  const mkZoomBtn = (label, delta) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.setAttribute('aria-label', delta > 0 ? 'Zoom in' : 'Zoom out');
    btn.style.cssText =
      'background:none;border:none;color:#333;font-size:18px;font-weight:400;width:36px;height:36px;' +
      'cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;flex:none;';
    btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f0f0'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
    btn.addEventListener('click', () => {
      changeZoom(delta, host);
      showZoomLabel();
    });
    return btn;
  };

  const IC_EXPAND =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  const IC_COMPRESS =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>';

  const mkFullscreenBtn = () => {
    const btn = document.createElement('button');
    btn.title = 'Fullscreen';
    btn.style.cssText =
      'background:none;border:none;color:#333;width:36px;height:36px;cursor:pointer;display:flex;' +
      'align-items:center;justify-content:center;padding:0;flex:none;';
    btn.innerHTML = IC_EXPAND;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f0f0'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
    fullscreenHandler = () => {
      btn.innerHTML = document.fullscreenElement ? IC_COMPRESS : IC_EXPAND;
      btn.title = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
    };
    document.addEventListener('fullscreenchange', fullscreenHandler);
    return btn;
  };

  zoomFloat.appendChild(mkZoomBtn('+', 10));
  zoomFloat.appendChild(mkDivider());
  zoomFloat.appendChild(mkZoomBtn('−', -10));
  zoomFloat.appendChild(mkDivider());
  zoomFloat.appendChild(mkFullscreenBtn());
  document.body.appendChild(zoomFloat);
}

export function unmountZoomWidget() {
  if (zoomFloat?.parentNode) {
    zoomFloat.parentNode.removeChild(zoomFloat);
  }
  zoomFloat = null;
  if (fullscreenHandler) {
    document.removeEventListener('fullscreenchange', fullscreenHandler);
    fullscreenHandler = null;
  }
  clearTimeout(zoomLabelTimer);
}

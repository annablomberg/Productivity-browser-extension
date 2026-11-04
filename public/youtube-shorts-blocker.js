const shortsStorageKey = 'youtubeShortsBlocked';
const shortsStyleId = 'heartbloom-shorts-blocker';
const shortsStyles = `
  ytd-reel-shelf-renderer,
  ytd-rich-shelf-renderer[is-shorts],
  ytd-rich-grid-slim-media,
  a[href="/shorts"],
  ytd-guide-entry-renderer:has(a[href="/shorts"]),
  ytd-mini-guide-entry-renderer:has(a[href="/shorts"]),
  ytd-rich-item-renderer:has(a[href^="/shorts/"]),
  ytd-video-renderer:has(a[href^="/shorts/"]),
  ytd-grid-video-renderer:has(a[href^="/shorts/"]),
  ytd-compact-video-renderer:has(a[href^="/shorts/"]),
  ytd-search-pyv-renderer:has(a[href^="/shorts/"]),
  ytm-reel-shelf-renderer,
  ytm-shorts-lockup-view-model,
  ytm-pivot-bar-item-renderer:has(a[href="/shorts"]) {
    display: none !important;
  }
`;

let shortsBlocked = false;
let settingChangedSinceLoad = false;

function isShortsPage() {
  return /^\/shorts(?:\/|$)/.test(location.pathname);
}

function applyShortsSetting() {
  if (shortsBlocked && isShortsPage()) {
    location.replace('https://www.youtube.com/');
    return;
  }

  const existingStyle = document.getElementById(shortsStyleId);
  if (shortsBlocked && !existingStyle) {
    const parent = document.head || document.documentElement;
    if (!parent) return;
    const style = document.createElement('style');
    style.id = shortsStyleId;
    style.textContent = shortsStyles;
    parent.appendChild(style);
  } else if (!shortsBlocked) {
    existingStyle?.remove();
  }
}

chrome.storage.local.get(shortsStorageKey).then((items) => {
  if (settingChangedSinceLoad) return;
  shortsBlocked = items[shortsStorageKey] === true;
  applyShortsSetting();
}).catch((error) => console.error('Could not load the YouTube Shorts setting:', error));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !(shortsStorageKey in changes)) return;
  settingChangedSinceLoad = true;
  shortsBlocked = changes[shortsStorageKey].newValue === true;
  applyShortsSetting();
});

document.addEventListener('yt-navigate-start', applyShortsSetting);
document.addEventListener('yt-navigate-finish', applyShortsSetting);
document.addEventListener('DOMContentLoaded', applyShortsSetting, { once: true });
window.addEventListener('popstate', applyShortsSetting);
document.addEventListener('click', (event) => {
  if (!shortsBlocked) return;
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  const href = link?.getAttribute('href');
  if (!href) return;
  try {
    const url = new URL(href, location.href);
    if ((url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com')) && /^\/shorts(?:\/|$)/.test(url.pathname)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  } catch {
    // Ignore malformed links on the page.
  }
}, true);

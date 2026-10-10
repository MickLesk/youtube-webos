/**
 * Opens a chosen page instead of Home when the app starts.
 */
import { configRead } from './config';

const PAGES: Record<string, string> = {
  subscriptions: '/browse?c=FEsubscriptions',
  history: '/browse?c=FEhistory',
  library: '/browse?c=FElibrary'
};

function isHome() {
  const path = location.hash.replace(/^#/, '');
  return path === '' || path === '/' || path.startsWith('/?');
}

function isBrowsePage() {
  return document.body.classList.contains('WEB_PAGE_TYPE_BROWSE');
}

const target = PAGES[configRead('startPage') as string];

// Only act on a plain start on Home, not when launched into a video or
// search (e.g. from casting or voice), and only once per app start.
if (target && isHome()) {
  const obs = new MutationObserver(() => {
    if (!isBrowsePage()) return;
    obs.disconnect();
    if (isHome()) {
      console.info('[start-page] opening', target);
      location.hash = `#${target}`;
    }
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Stop waiting if the viewer navigates elsewhere first.
  window.addEventListener('hashchange', function stop() {
    if (!isHome()) {
      obs.disconnect();
      window.removeEventListener('hashchange', stop);
    }
  });
}

/**
 * Remote shortcuts outside of the player: number keys open pages, and
 * holding Back returns to Home.
 */
import { configRead } from './config';
import { t } from './i18n';
import { currentPage, isWatchPage } from './page-state';
import { showNotification } from './ui';

const KEY_BACK_WEBOS = 461;
const HOLD_MS = 900;

const PAGES: Record<number, { hash: string; name: () => string }> = {
  1: { hash: '#/', name: () => t('msg.pageHome', 'Home') },
  2: {
    hash: '#/browse?c=FEsubscriptions',
    name: () => t('msg.pageSubscriptions', 'Subscriptions')
  },
  3: { hash: '#/search', name: () => t('msg.pageSearch', 'Search') },
  4: {
    hash: '#/browse?c=FElibrary',
    name: () => t('msg.pageLibrary', 'Library')
  },
  5: {
    hash: '#/browse?c=FEhistory',
    name: () => t('msg.pageHistory', 'History')
  }
};

function digitOf(keyCode: number): number | null {
  if (keyCode >= 48 && keyCode <= 57) return keyCode - 48;
  if (keyCode >= 96 && keyCode <= 105) return keyCode - 96;
  return null;
}

function goTo(page: { hash: string; name: () => string }) {
  location.hash = page.hash;
  showNotification(page.name(), 1200);
}

let backDownAt = 0;
let backHandled = false;

document.addEventListener(
  'keydown',
  (evt) => {
    if (document.activeElement instanceof HTMLInputElement) return;
    if (document.querySelector('.ytaf-ui-container[style*="block"]')) return;

    if (evt.keyCode === KEY_BACK_WEBOS && configRead('longBackHome')) {
      const now = Date.now();
      // The first press is YouTube's; repeats while holding are ours.
      if (!backDownAt || !evt.repeat) {
        if (!evt.repeat) {
          backDownAt = now;
          backHandled = false;
        }
      }
      if (evt.repeat && !backHandled && now - backDownAt >= HOLD_MS) {
        backHandled = true;
        goTo(PAGES[1]!);
      }
      if (evt.repeat) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      return;
    }

    const digit = digitOf(evt.keyCode);
    if (digit === null || !configRead('numberKeyPages')) return;
    // Numbers seek inside videos and type on the search page.
    if (isWatchPage() || currentPage() === 'SEARCH') return;
    const page = PAGES[digit];
    if (!page) return;
    goTo(page);
    evt.preventDefault();
    evt.stopPropagation();
  },
  true
);

document.addEventListener(
  'keyup',
  (evt) => {
    if (evt.keyCode !== KEY_BACK_WEBOS) return;
    backDownAt = 0;
    if (backHandled) {
      backHandled = false;
      evt.preventDefault();
      evt.stopPropagation();
    }
  },
  true
);

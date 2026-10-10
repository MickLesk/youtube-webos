/**
 * Tells the viewer once after an update that new settings are available.
 */
import { t } from './i18n';
import { showNotification } from './ui';

declare const __YTAF_VERSION__: string;

const STORAGE_KEY = 'ytaf-last-version';

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const previous = readStored();

if (previous !== __YTAF_VERSION__) {
  try {
    window.localStorage.setItem(STORAGE_KEY, __YTAF_VERSION__);
  } catch {
    // Storage unavailable: show the notice every time rather than never.
  }

  // Skip the very first start; the "press green" hint covers that.
  if (previous !== null) {
    setTimeout(() => {
      showNotification(
        t(
          'msg.updated',
          'Updated to v{version} - new options in the settings (green button)',
          { version: __YTAF_VERSION__ }
        ),
        6000,
        'green'
      );
    }, 3000);
  }
}

/**
 * Checks once a day whether a newer release is published on GitHub and
 * shows a notice. Nothing is downloaded or installed automatically.
 */
import { configRead } from './config';
import { t } from './i18n';
import { createLogger } from './logger';
import { addDiagnosticsLines } from './options-panel';
import { showNotification } from './ui';

declare const __YTAF_VERSION__: string;

const RELEASES_API =
  'https://api.github.com/repos/MickLesk/youtube-webos/releases/latest';
const STORAGE_KEY = 'ytaf-update-check';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const START_DELAY_MS = 15000;

const logger = createLogger('update-check');

let latestVersion: string | null = null;

/** Newest published version, or `null` if unknown or not newer. */
export function getAvailableUpdate(): string | null {
  return latestVersion;
}

/** Compares "1.2.3"-style versions. Positive if `a` is newer. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.');
  const pb = b.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff =
      (parseInt(pa[i] ?? '0', 10) || 0) - (parseInt(pb[i] ?? '0', 10) || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface Stored {
  checkedAt: number;
  version: string | null;
}

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(value: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable: check again on next start.
  }
}

function announce(version: string) {
  if (compareVersions(version, __YTAF_VERSION__) <= 0) return;
  latestVersion = version;
  showNotification(
    t(
      'msg.updateAvailable',
      'Update available: v{version} (installed v{current})',
      {
        version,
        current: __YTAF_VERSION__
      }
    ),
    8000,
    'green'
  );
}

async function check() {
  if (!configRead('checkForUpdates')) return;

  const stored = readStored();
  if (stored && Date.now() - stored.checkedAt < CHECK_INTERVAL_MS) {
    if (stored.version) announce(stored.version);
    return;
  }

  try {
    const resp = await fetch(RELEASES_API);
    if (!resp.ok) {
      // No release published yet is not an error worth logging.
      writeStored({ checkedAt: Date.now(), version: null });
      return;
    }
    const release = (await resp.json()) as { tag_name?: string };
    const version = (release.tag_name ?? '').replace(/^v/, '') || null;
    writeStored({ checkedAt: Date.now(), version });
    if (version) announce(version);
  } catch (err) {
    logger.warn('could not check for updates:', err);
  }
}

setTimeout(() => void check(), START_DELAY_MS);

addDiagnosticsLines(() => [
  latestVersion
    ? t(
        'ui.updateAvailable',
        'Version {current}, update available: {version}',
        {
          current: __YTAF_VERSION__,
          version: latestVersion
        }
      )
    : t('ui.versionCurrent', 'Version {current}', { current: __YTAF_VERSION__ })
]);

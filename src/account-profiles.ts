/**
 * Separate settings per YouTube account: finds out which account is active
 * and switches the settings profile when it changes.
 */
import {
  configActiveProfile,
  configAddChangeListener,
  configRead,
  configUseProfile
} from './config';
import { t } from './i18n';
import { getService } from './innertube';
import { createLogger } from './logger';
import { addDiagnosticsLines } from './options-panel';

const CHECK_INTERVAL_MS = 30000;
const ID_FIELDS = [
  'obfuscatedGaiaId',
  'gaiaId',
  'pageId',
  'channelId',
  'delegatedSessionId',
  'userId',
  'id'
];

const logger = createLogger('account-profiles');

interface IdentityService {
  get(): unknown;
}

/** The service may answer with a value, a promise or an observable. */
function resolveValue(result: unknown): Promise<unknown> {
  const maybe = result as {
    then?: unknown;
    subscribe?: (next: (value: unknown) => void) => void;
  } | null;
  if (maybe && typeof maybe.then === 'function') {
    return result as Promise<unknown>;
  }
  if (maybe && typeof maybe.subscribe === 'function') {
    return new Promise((resolve) => maybe.subscribe!(resolve));
  }
  return Promise.resolve(result);
}

type Status = 'off' | 'unknown' | 'active';
let status: Status = 'off';
let loggedFields = false;

function idOf(identity: unknown): string | null {
  if (typeof identity !== 'object' || identity === null) return null;
  const record = identity as Record<string, unknown>;
  for (const field of ID_FIELDS) {
    const value = record[field];
    if (typeof value === 'string' && value) return value;
  }
  // One level down, e.g. { identity: { ... } }.
  for (const key of Object.keys(record)) {
    const inner = record[key];
    if (typeof inner !== 'object' || inner === null) continue;
    for (const field of ID_FIELDS) {
      const value = (inner as Record<string, unknown>)[field];
      if (typeof value === 'string' && value) return value;
    }
  }
  if (!loggedFields) {
    loggedFields = true;
    // Only the field names, never values: helps support new layouts.
    logger.warn('account not recognized; fields:', Object.keys(record));
  }
  return null;
}

async function update() {
  if (!configRead('perAccountSettings')) {
    status = 'off';
    configUseProfile(null);
    return;
  }

  const service = getService<IdentityService>('CurrentIdentityService');
  if (!service) {
    status = 'unknown';
    return;
  }
  try {
    const identity = await resolveValue(service.get());
    const id = idOf(identity);
    if (!id) {
      status = 'unknown';
      return;
    }
    status = 'active';
    configUseProfile(id);
  } catch (err) {
    status = 'unknown';
    logger.warn('could not read the current account:', err);
  }
}

configAddChangeListener('perAccountSettings', () => void update());
setTimeout(() => void update(), 5000);
setInterval(() => void update(), CHECK_INTERVAL_MS);

addDiagnosticsLines(() => {
  if (status === 'off') return [];
  if (status === 'unknown') {
    return [t('ui.profileUnknown', 'Account settings: account not recognized')];
  }
  const id = configActiveProfile() ?? '';
  return [
    t('ui.profileActive', 'Account settings: profile …{id}', {
      id: id.slice(-4)
    })
  ];
});

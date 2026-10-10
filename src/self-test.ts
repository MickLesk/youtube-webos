/**
 * Checks shortly after start whether the YouTube internals our features
 * rely on were found. A YouTube update that renames them shows up here
 * (Diagnostics page and log) instead of features silently doing nothing.
 */
import { t } from './i18n';
import { getParseStats } from './hooks/json-parse';
import { getService } from './innertube';
import { createLogger } from './logger';
import { addDiagnosticsLines } from './options-panel';
import { getStartupFailures } from './startup-errors';

export interface SelfTestResult {
  /** English name, also used as translation id `selftest.<name>`. */
  name: string;
  ok: boolean | null;
  /** Features that do not work when the check fails. */
  affects: string;
}

const CHECK_DELAY_MS = 20000;
const logger = createLogger('self-test');

const checks: { name: string; affects: string; run: () => boolean }[] = [
  {
    name: 'Command hook',
    affects: 'account skip, long-press menu, settings entry',
    run: () => {
      const yttv = window._yttv;
      if (!yttv) return false;
      for (const key in yttv) {
        const target = yttv[key] as { instance?: { resolveCommand?: unknown } };
        if (target && typeof target.instance?.resolveCommand === 'function') {
          return true;
        }
      }
      return false;
    }
  },
  {
    name: 'API client',
    affects: '"Not interested", "Don\'t recommend channel"',
    run: () => !!getService('KabukiInnerTubeClient')
  },
  {
    name: 'Player service',
    affects: 'picture-in-picture',
    run: () => !!getService('PlayerService')
  },
  {
    name: 'Video player',
    affects: 'speed, SponsorBlock, overlays, queue',
    run: () => !!document.querySelector('.html5-video-player')
  }
];

const results: SelfTestResult[] = checks.map((check) => ({
  name: check.name,
  ok: null,
  affects: check.affects
}));

export function getSelfTestResults(): SelfTestResult[] {
  return results;
}

/** One line per check for the Diagnostics page. */
export function describeSelfTest(result: SelfTestResult): string {
  const name = t(`selftest.${result.name}`, result.name);
  if (result.ok === null) {
    return `${name}: ${t('selftest.pending', 'not checked yet')}`;
  }
  if (result.ok) return `${name}: OK`;
  return `${name}: ${t('selftest.missing', 'not found')} (${t(
    `selftest.affects.${result.name}`,
    result.affects
  )})`;
}

function runChecks() {
  checks.forEach((check, index) => {
    let ok = false;
    try {
      ok = check.run();
    } catch {
      ok = false;
    }
    const result = results[index]!;
    if (!ok && result.ok !== false) {
      logger.warn(`${check.name} not found; affects ${check.affects}`);
    }
    result.ok = ok;
  });
}

setTimeout(runChecks, CHECK_DELAY_MS);
// The player may only appear with the first video; check again later.
setTimeout(runChecks, CHECK_DELAY_MS * 6);

addDiagnosticsLines(() => {
  const stats = getParseStats();
  const lines = getStartupFailures().map(
    (failure) => `${t('selftest.startFailed', 'Failed to start')}: ${failure}`
  );
  for (const result of results) lines.push(describeSelfTest(result));
  if (stats.responses) {
    lines.push(
      t(
        'selftest.timing',
        'Processing: {count} responses, average {avg} ms, slowest {max} ms',
        {
          count: stats.responses,
          avg: (stats.totalMs / stats.responses).toFixed(1),
          max: stats.maxMs.toFixed(1)
        }
      )
    );
  }
  return lines;
});

/**
 * Shows on screen which part of the script failed to start. Without it a
 * failing module silently takes every later feature (and the green button)
 * with it, and on a TV there is no console to look at.
 *
 * Deliberately free of other imports, so it works even when config, i18n or
 * the settings panel are what failed.
 */

const failures: string[] = [];
let box: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const SHOW_MS = 30000;

function describe(err: unknown): string {
  if (err instanceof Error) {
    const where = (err.stack ?? '').split('\n')[1]?.trim() ?? '';
    return `${err.name}: ${err.message}${where ? ` (${where})` : ''}`;
  }
  return String(err);
}

function render() {
  if (!document.body) {
    setTimeout(render, 500);
    return;
  }
  if (!box) {
    box = document.createElement('div');
    const style = box.style;
    style.position = 'absolute';
    style.left = '2%';
    style.right = '2%';
    style.top = '2%';
    style.zIndex = '3000';
    style.padding = '0.6em 1em';
    style.background = 'rgba(120, 0, 0, 0.92)';
    style.color = '#fff';
    style.fontSize = '1rem';
    style.fontFamily = 'monospace';
    style.whiteSpace = 'pre-wrap';
    style.borderRadius = '0.4em';
  }
  const german = (navigator.language || '').toLowerCase().indexOf('de') === 0;
  const title = german
    ? 'YouTube Extended: Fehler beim Start (bitte abfotografieren)'
    : 'YouTube Extended: startup error (please take a photo)';
  box.textContent = `${title}\n${failures.join('\n')}`;
  if (!box.parentNode) document.body.appendChild(box);

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (box?.parentNode) box.parentNode.removeChild(box);
  }, SHOW_MS);
}

/** All startup failures so far, for the Diagnostics page. */
export function getStartupFailures(): readonly string[] {
  return failures;
}

export function reportStartupError(name: string, err: unknown) {
  const line = `${name}: ${describe(err)}`;
  failures.push(line);
  console.error('[startup]', line, err);
  render();
}

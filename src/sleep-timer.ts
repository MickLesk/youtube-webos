/**
 * Pauses playback after a chosen number of minutes. The timer only lives for
 * the current session: it starts when the option is chosen and is reset on
 * the next app start.
 */
import { configAddChangeListener, configRead, configWrite } from './config';
import { showNotification } from './ui';

const WARNING_MS = 60 * 1000;

let fireTimer: number | undefined;
let warnTimer: number | undefined;

function clearTimers() {
  clearTimeout(fireTimer);
  clearTimeout(warnTimer);
  fireTimer = warnTimer = undefined;
}

function arm(minutes: number) {
  clearTimers();
  if (!minutes) return;

  const ms = minutes * 60 * 1000;
  showNotification(`Sleep timer: pausing in ${minutes} minutes`, 3000);

  if (ms > WARNING_MS) {
    warnTimer = window.setTimeout(() => {
      showNotification('Sleep timer: pausing in 1 minute', 5000, 'yellow');
    }, ms - WARNING_MS);
  }

  fireTimer = window.setTimeout(() => {
    for (const video of document.querySelectorAll('video')) video.pause();
    showNotification('Sleep timer: playback paused', 10000, 'yellow');
    configWrite('sleepTimer', 0);
  }, ms);
}

// Session only: never re-arm a timer left over from last time.
if (configRead('sleepTimer')) configWrite('sleepTimer', 0);

configAddChangeListener('sleepTimer', (evt) => {
  arm(Number((evt as CustomEvent<{ newValue: unknown }>).detail.newValue) || 0);
});

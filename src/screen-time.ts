/**
 * Counts how long videos play, per day and per channel, only on this TV.
 * Shown in the settings (General page).
 */
import { configRead } from './config';
import { t } from './i18n';
import { getPlayerManager, PlayerMode } from './player_api';
import { showNotification } from './ui';

const STORAGE_KEY = 'ytaf-screen-time';
const TICK_MS = 10000;
const KEEP_DAYS = 60;
const MAX_CHANNELS = 200;

interface Stats {
  /** Seconds per day, keyed by local date "2026-11-05". */
  days: Record<string, number>;
  /** Seconds per channel name. */
  channels: Record<string, number>;
  /** Seconds since the last reset. */
  total: number;
  since: number;
}

function empty(): Stats {
  return { days: {}, channels: {}, total: 0, since: Date.now() };
}

export function getScreenTime(): Stats {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stats = raw ? (JSON.parse(raw) as Stats) : null;
    if (stats && stats.days && stats.channels) return stats;
  } catch {
    // Fall through.
  }
  return empty();
}

function save(stats: Stats) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Not critical.
  }
}

export function resetScreenTime() {
  save(empty());
}

function dayKey(date: Date) {
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Seconds watched today, in the last 7 days and in total, plus top channels. */
export function summarizeScreenTime() {
  const stats = getScreenTime();
  const now = new Date();
  let today = 0;
  let week = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const seconds = stats.days[dayKey(date)] || 0;
    if (i === 0) today = seconds;
    week += seconds;
  }
  const channels = Object.keys(stats.channels)
    .map((name) => ({ name, seconds: stats.channels[name]! }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5);
  return { today, week, total: stats.total, since: stats.since, channels };
}

// Not awaited at module level: the settings panel imports this module and
// must not wait for the player.
void getPlayerManager().then((playerManager) => {
  setInterval(() => tick(playerManager), TICK_MS);
});

/** Seconds watched without a break of 10 minutes or more. */
let sessionSeconds = 0;
let lastPlayingAt = 0;
let breakReminded = false;
let limitWarnedOn = '';

function formatHours(seconds: number) {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h} h ${m < 10 ? '0' : ''}${m} min` : `${m} min`;
}

function remind(todaySeconds: number) {
  const breakMin = Number(configRead('breakReminder')) || 0;
  if (breakMin && !breakReminded && sessionSeconds >= breakMin * 60) {
    breakReminded = true;
    showNotification(
      t('msg.breakReminder', 'Watching for {time} now. Time for a break?', {
        time: formatHours(sessionSeconds)
      }),
      8000,
      'red'
    );
  }
  const limitHours = Number(configRead('dailyLimit')) || 0;
  const today = dayKey(new Date());
  if (
    limitHours &&
    limitWarnedOn !== today &&
    todaySeconds >= limitHours * 3600
  ) {
    limitWarnedOn = today;
    showNotification(
      t('msg.dailyLimit', 'Daily limit reached: {time} watched today', {
        time: formatHours(todaySeconds)
      }),
      8000,
      'red'
    );
  }
}

function tick(playerManager: Awaited<ReturnType<typeof getPlayerManager>>) {
  if (playerManager.playerMode !== PlayerMode.NORMAL) return;
  const video = playerManager.player.querySelector('video');
  const playing =
    !!video && !video.paused && !video.ended && video.readyState >= 3;
  const now = Date.now();
  if (!playing) {
    if (lastPlayingAt && now - lastPlayingAt > 10 * 60 * 1000) {
      sessionSeconds = 0;
      breakReminded = false;
      lastPlayingAt = 0;
    }
    return;
  }
  lastPlayingAt = now;
  const seconds = TICK_MS / 1000;
  sessionSeconds += seconds;
  if (!configRead('trackScreenTime')) {
    remind(0);
    return;
  }

  const stats = getScreenTime();
  const key = dayKey(new Date());
  stats.days[key] = (stats.days[key] || 0) + seconds;
  stats.total += seconds;
  remind(stats.days[key]!);

  const channel = playerManager.player.getVideoData().author?.trim();
  if (channel) {
    stats.channels[channel] = (stats.channels[channel] || 0) + seconds;
    const names = Object.keys(stats.channels);
    if (names.length > MAX_CHANNELS) {
      names.sort((a, b) => stats.channels[a]! - stats.channels[b]!);
      for (const name of names.slice(0, names.length - MAX_CHANNELS)) {
        delete stats.channels[name];
      }
    }
  }

  const days = Object.keys(stats.days).sort();
  while (days.length > KEEP_DAYS) delete stats.days[days.shift()!];
  save(stats);
}

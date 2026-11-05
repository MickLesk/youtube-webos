/**
 * Counts how long videos play, per day and per channel, only on this TV.
 * Shown in the settings (General page).
 */
import { configRead } from './config';
import { getPlayerManager, PlayerMode } from './player_api';

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

function tick(playerManager: Awaited<ReturnType<typeof getPlayerManager>>) {
  if (!configRead('trackScreenTime')) return;
  if (playerManager.playerMode !== PlayerMode.NORMAL) return;
  const video = playerManager.player.querySelector('video');
  if (!video || video.paused || video.ended || video.readyState < 3) return;

  const stats = getScreenTime();
  const seconds = TICK_MS / 1000;
  const key = dayKey(new Date());
  stats.days[key] = (stats.days[key] || 0) + seconds;
  stats.total += seconds;

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

/**
 * How much time SponsorBlock saved, kept across sessions and shown on the
 * SponsorBlock page of the settings.
 */
const STATS_KEY = 'ytaf-sponsorblock-stats';

export interface SkipStats {
  seconds: number;
  count: number;
}

export function getSkipStats(): SkipStats {
  try {
    const stats = JSON.parse(
      window.localStorage.getItem(STATS_KEY) ?? 'null'
    ) as SkipStats | null;
    if (stats && typeof stats.seconds === 'number') return stats;
  } catch {
    // Fall through to empty stats.
  }
  return { seconds: 0, count: 0 };
}

export function recordSkip(seconds: number) {
  if (!(seconds > 0)) return;
  const stats = getSkipStats();
  stats.seconds += seconds;
  stats.count += 1;
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Not critical.
  }
}

export function resetSkipStats() {
  try {
    window.localStorage.removeItem(STATS_KEY);
  } catch {
    // Not critical.
  }
}

/** "2 h 05 min" or "4 min 12 s". */
export function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  if (h) return `${h} h ${pad(m)} min`;
  return `${m} min ${pad(s)} s`;
}

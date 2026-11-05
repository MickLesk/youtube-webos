/**
 * Bookmarks inside videos: a color button stores the current time, another
 * (or the quick menu) jumps to the next bookmark. Kept per video on this TV.
 */
import { t } from './i18n';
import { isWatchPage } from './page-state';
import { getPlayerManager, PlayerMode } from './player_api';
import { setColorActionHandler, showNotification } from './ui';

const STORAGE_KEY = 'ytaf-bookmarks';
const MAX_VIDEOS = 200;
const MAX_PER_VIDEO = 20;

type Bookmarks = Record<string, number[]>;

function load(): Bookmarks {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Bookmarks) : {};
  } catch {
    return {};
  }
}

function save(all: Bookmarks) {
  const ids = Object.keys(all);
  // Oldest first in insertion order: drop from the front.
  while (ids.length > MAX_VIDEOS) delete all[ids.shift()!];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Not critical.
  }
}

function formatTime(seconds: number) {
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const playerManager = await getPlayerManager();

function current() {
  if (!isWatchPage() || playerManager.playerMode !== PlayerMode.NORMAL) {
    return null;
  }
  const id = playerManager.currentVideoID;
  const video = playerManager.player.querySelector('video');
  return id && video ? { id, video } : null;
}

export function bookmarkCount() {
  const id = playerManager.currentVideoID;
  return id ? (load()[id] ?? []).length : 0;
}

setColorActionHandler('bookmark', () => {
  const ctx = current();
  if (!ctx) return false;
  const all = load();
  const time = Math.floor(ctx.video.currentTime);
  const list = (all[ctx.id] ?? []).filter((b) => Math.abs(b - time) > 2);
  list.push(time);
  list.sort((a, b) => a - b);
  delete all[ctx.id];
  all[ctx.id] = list.slice(-MAX_PER_VIDEO);
  save(all);
  showNotification(
    t('msg.bookmarkSet', 'Bookmark set: {time}', { time: formatTime(time) }),
    1500
  );
  return true;
});

setColorActionHandler('nextBookmark', () => {
  const ctx = current();
  if (!ctx) return false;
  const list = load()[ctx.id] ?? [];
  if (!list.length) {
    showNotification(t('msg.noBookmarks', 'No bookmarks in this video'), 1500);
    return true;
  }
  const time = ctx.video.currentTime;
  let index = list.findIndex((b) => b > time + 1);
  if (index === -1) index = 0;
  ctx.video.currentTime = list[index]!;
  showNotification(
    t('msg.bookmarkJump', 'Bookmark {index}/{count}: {time}', {
      index: index + 1,
      count: list.length,
      time: formatTime(list[index]!)
    }),
    1500
  );
  return true;
});

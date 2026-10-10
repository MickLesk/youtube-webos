/**
 * Remembers where each video was stopped and continues there next time,
 * also when the YouTube watch history is off or nobody is signed in.
 * Only steps in when YouTube itself starts the video from the beginning.
 */
import { configRead } from './config';
import { t } from './i18n';
import { getPlayerManager, PlayerMode } from './player_api';
import { showNotification } from './ui';

const STORAGE_KEY = 'ytaf-positions';
const MAX_ENTRIES = 300;
const SAVE_INTERVAL_MS = 10000;
/** Shorter videos are not worth resuming. */
const MIN_DURATION_S = 5 * 60;
/** Near the start or end counts as "not started" or "finished". */
const EDGE_S = 30;
/** YouTube resumed by itself if playback starts later than this. */
const START_TOLERANCE_S = 5;

interface Entry {
  t: number;
  at: number;
}

type Positions = Record<string, Entry>;

function load(): Positions {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Positions) : {};
  } catch {
    return {};
  }
}

function save(positions: Positions) {
  const ids = Object.keys(positions);
  if (ids.length > MAX_ENTRIES) {
    ids.sort((a, b) => positions[a]!.at - positions[b]!.at);
    for (const id of ids.slice(0, ids.length - MAX_ENTRIES)) {
      delete positions[id];
    }
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Storage full or unavailable: resuming is best effort.
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
const player = playerManager.player;

function getVideo() {
  return player.querySelector('video');
}

function isResumable(video: HTMLVideoElement) {
  return (
    playerManager.playerMode === PlayerMode.NORMAL &&
    !player.getVideoData().isLive &&
    isFinite(video.duration) &&
    video.duration >= MIN_DURATION_S
  );
}

function remember() {
  if (!configRead('rememberPosition')) return;
  const videoId = playerManager.currentVideoID;
  const video = getVideo();
  if (!videoId || !video || !isResumable(video)) return;

  const positions = load();
  const time = video.currentTime;
  if (time < EDGE_S || time > video.duration - EDGE_S) {
    if (!positions[videoId]) return;
    delete positions[videoId];
  } else {
    positions[videoId] = { t: Math.floor(time), at: Date.now() };
  }
  save(positions);
}

/** Give YouTube time to apply its own resume (watch history) first. */
const RESUME_DELAY_MS = 2500;

interface SeekablePlayer {
  getCurrentTime?: () => number;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
}

/** Where YouTube's player is (or is about to be), not just the element. */
function playerTime(video: HTMLVideoElement) {
  const own = (player as unknown as SeekablePlayer).getCurrentTime?.();
  return typeof own === 'number' && isFinite(own)
    ? Math.max(own, video.currentTime)
    : video.currentTime;
}

let resumeTimer: ReturnType<typeof setTimeout> | null = null;

function resume(this: typeof playerManager) {
  this.removeEventListener('playbackStart', resume);
  if (!configRead('rememberPosition')) return;

  const videoId = this.currentVideoID;
  if (resumeTimer) clearTimeout(resumeTimer);
  // Seeking the element while YouTube seeks to its own resume point left
  // the player loading forever, so wait and only step in when it didn't.
  resumeTimer = setTimeout(() => {
    resumeTimer = null;
    const video = getVideo();
    if (!videoId || videoId !== playerManager.currentVideoID) return;
    if (!video || !isResumable(video) || video.seeking || video.paused) return;
    if (playerTime(video) > START_TOLERANCE_S + RESUME_DELAY_MS / 1000) return;

    const entry = load()[videoId];
    if (!entry || entry.t > video.duration - EDGE_S) return;

    const seekable = player as unknown as SeekablePlayer;
    if (typeof seekable.seekTo === 'function') seekable.seekTo(entry.t, true);
    else video.currentTime = entry.t;
    showNotification(
      t('msg.resumed', 'Continuing at {time}', { time: formatTime(entry.t) })
    );
  }, RESUME_DELAY_MS);
}

playerManager.addEventListener('newVideo', function () {
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = null;
  this.removeEventListener('playbackStart', resume);
  this.addEventListener('playbackStart', resume);
});

setInterval(() => {
  const video = getVideo();
  if (video && !video.paused) remember();
}, SAVE_INTERVAL_MS);

// Also store the exact spot when pausing or leaving the video.
document.addEventListener('pause', remember, true);

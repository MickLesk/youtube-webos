/**
 * Remembers where each video was stopped and continues there next time,
 * also when the YouTube watch history is off or nobody is signed in.
 * Only steps in when YouTube itself starts the video from the beginning.
 */
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';
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

/**
 * Resuming by seeking the <video> element while YouTube's player was still
 * starting left the player loading forever on some TVs. The stored position
 * is therefore handed to YouTube in the player response, the same way a
 * "t=" link or the watch history resumes, and the player seeks itself.
 */
interface PlayerConfig {
  playbackStartConfig?: { startSeconds?: unknown };
  [key: string]: unknown;
}

/** Videos whose start position YouTube itself takes care of. */
const handledByYouTube: Record<string, true> = {};

addParseHandler('resume-position', (res) => {
  const details = res.videoDetails as { videoId?: unknown } | undefined;
  const videoId = details?.videoId;
  if (typeof videoId !== 'string' || !('streamingData' in res)) return;

  const config = (res.playerConfig ?? {}) as PlayerConfig;
  const start = config.playbackStartConfig?.startSeconds;
  if (typeof start === 'number' && start > 0) {
    // Watch history or a "t=" link: YouTube resumes on its own.
    handledByYouTube[videoId] = true;
    return;
  }
  delete handledByYouTube[videoId];
  if (!configRead('rememberPosition')) return;

  const entry = load()[videoId];
  const lengthSeconds = Number(
    (details as { lengthSeconds?: unknown }).lengthSeconds
  );
  if (!entry || entry.t < EDGE_S) return;
  if (lengthSeconds > 0 && entry.t > lengthSeconds - EDGE_S) return;
  if (lengthSeconds > 0 && lengthSeconds < MIN_DURATION_S) return;

  config.playbackStartConfig = {
    ...config.playbackStartConfig,
    startSeconds: entry.t
  };
  res.playerConfig = config;
  handledByYouTube[videoId] = true;
  pendingNotice = { videoId, time: entry.t };
});

let pendingNotice: { videoId: string; time: number } | null = null;

/**
 * Only the notice is shown here. The video element is never seeked by this
 * module: the stored position reaches the player through the response
 * above, and YouTube's own start position always wins.
 */
function onPlaybackStart(this: typeof playerManager) {
  this.removeEventListener('playbackStart', onPlaybackStart);
  const videoId = this.currentVideoID;
  const notice = pendingNotice;
  pendingNotice = null;
  if (!videoId || !notice || notice.videoId !== videoId) return;
  if (handledByYouTube[videoId] !== true) return;
  showNotification(
    t('msg.resumed', 'Continuing at {time}', { time: formatTime(notice.time) })
  );
}

playerManager.addEventListener('newVideo', function () {
  this.removeEventListener('playbackStart', onPlaybackStart);
  this.addEventListener('playbackStart', onPlaybackStart);
});

setInterval(() => {
  const video = getVideo();
  if (video && !video.paused) remember();
}, SAVE_INTERVAL_MS);

// Also store the exact spot when pausing or leaving the video.
document.addEventListener('pause', remember, true);

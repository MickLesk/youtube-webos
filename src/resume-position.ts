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

/** What a "Continue watching" tile needs to show the video. */
export interface VideoMeta {
  title: string;
  author: string;
  /** Length in seconds. */
  len: number;
  /** Thumbnail URL. */
  thumb: string;
}

interface Entry {
  t: number;
  at: number;
  meta?: VideoMeta;
}

export interface ContinueEntry extends VideoMeta {
  videoId: string;
  /** Position in seconds. */
  time: number;
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

/** Details of recently loaded videos, from their player responses. */
const metaById: Record<string, VideoMeta> = {};
const metaOrder: string[] = [];

function rememberMeta(videoId: string, details: Record<string, unknown>) {
  const thumbs = (details.thumbnail as { thumbnails?: unknown } | undefined)
    ?.thumbnails;
  let thumb = '';
  if (Array.isArray(thumbs)) {
    // The largest one up to 720p wide is plenty for a tile.
    for (const item of thumbs) {
      const url = (item as { url?: unknown; width?: unknown }).url;
      const width = Number((item as { width?: unknown }).width);
      if (typeof url === 'string' && (!thumb || width <= 720)) thumb = url;
    }
  }
  metaById[videoId] = {
    title: typeof details.title === 'string' ? details.title : '',
    author: typeof details.author === 'string' ? details.author : '',
    len: Number(details.lengthSeconds) || 0,
    thumb
  };
  if (metaOrder.indexOf(videoId) === -1) metaOrder.push(videoId);
  if (metaOrder.length > 50) delete metaById[metaOrder.shift()!];
}

/** Videos stopped in the middle, newest first, for the Home row. */
export function getContinueWatching(limit: number): ContinueEntry[] {
  const positions = load();
  return Object.keys(positions)
    .filter((id) => positions[id]!.meta && positions[id]!.t >= EDGE_S)
    .sort((a, b) => positions[b]!.at - positions[a]!.at)
    .slice(0, limit)
    .map((id) => ({
      ...positions[id]!.meta!,
      videoId: id,
      time: positions[id]!.t,
      at: positions[id]!.at
    }));
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
    const entry: Entry = { t: Math.floor(time), at: Date.now() };
    const meta = metaById[videoId] ?? positions[videoId]?.meta;
    if (meta) entry.meta = meta;
    positions[videoId] = entry;
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
  rememberMeta(videoId, details as Record<string, unknown>);

  const config = (res.playerConfig ?? {}) as PlayerConfig;
  const start = config.playbackStartConfig?.startSeconds;
  if (typeof start === 'number' && start > 0) {
    // Watch history or a "t=" link: YouTube resumes on its own.
    handledByYouTube[videoId] = true;
    return;
  }
  delete handledByYouTube[videoId];
  if (!configRead('rememberPosition')) return;
  // The response of an inline preview on the start page must start where
  // YouTube wants it: a preview that begins in the middle and is then
  // opened as a video left the player loading forever. Those videos are
  // resumed by resumeLate() once they really play.
  if (player.isInline() || !isWatchPage()) return;

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
  if (this.playerMode !== PlayerMode.NORMAL) return;
  this.removeEventListener('playbackStart', onPlaybackStart);
  const videoId = this.currentVideoID;
  const notice = pendingNotice;
  pendingNotice = null;
  if (!videoId) return;
  if (notice && notice.videoId === videoId && handledByYouTube[videoId]) {
    notify(notice.time);
    return;
  }
  if (handledByYouTube[videoId]) return;
  resumeLate(videoId);
}

function notify(time: number) {
  showNotification(
    t('msg.resumed', 'Continuing at {time}', { time: formatTime(time) })
  );
}

function isWatchPage() {
  return document.body.classList.contains('WEB_PAGE_TYPE_WATCH');
}

/** Videos already handled by resumeLate(), so a pause/play does not repeat it. */
const resumedLate: Record<string, true> = {};

/**
 * Fallback for videos whose response could not carry the position (opened
 * from a preview, or fetched before the watch page was shown). Waits until
 * the video really plays and then jumps, like a seek with the remote; the
 * seek is skipped if YouTube already started past the beginning.
 */
function resumeLate(videoId: string) {
  if (!configRead('rememberPosition') || resumedLate[videoId]) return;
  const entry = load()[videoId];
  if (!entry || entry.t < EDGE_S) return;
  resumedLate[videoId] = true;

  const started = Date.now();
  const video = getVideo();
  const initial = video ? video.currentTime : 0;
  const token = window.setInterval(() => {
    const current = getVideo();
    if (
      !current ||
      playerManager.currentVideoID !== videoId ||
      Date.now() - started > 15000
    ) {
      clearInterval(token);
      return;
    }
    const progressed =
      current.readyState >= 3 && current.currentTime > initial + 1;
    if (!progressed) return;
    clearInterval(token);
    if (!isResumable(current) || current.currentTime >= EDGE_S) return;
    if (entry.t > current.duration - EDGE_S) return;
    current.currentTime = entry.t;
    notify(entry.t);
  }, 250);
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

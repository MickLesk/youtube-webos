/**
 * A simple play queue: videos added from the long-press menu play one after
 * another when the current video ends. The queue is kept until the app
 * closes.
 */
import { t } from './i18n';
import { dispatchCommand, setCustomActionHandler } from './innertube';
import { getPlayerManager, PlayerMode } from './player_api';
import { setColorActionHandler, showNotification } from './ui';

type Json = Record<string, unknown>;

export interface QueuedVideo {
  videoId: string;
  title: string;
  watchEndpoint: Json;
}

const queue: QueuedVideo[] = [];

export function getQueueLength() {
  return queue.length;
}

export function addToQueue(video: QueuedVideo) {
  for (const queued of queue) {
    if (queued.videoId === video.videoId) {
      showNotification(t('msg.queueDuplicate', 'Already in the queue'));
      return;
    }
  }
  queue.push(video);
  showNotification(
    t('msg.queueAdded', 'Added to queue ({count}): {title}', {
      count: String(queue.length),
      title: video.title
    })
  );
}

export function clearQueue() {
  queue.length = 0;
  showNotification(t('msg.queueCleared', 'Queue cleared'));
}

/** Plays the next queued video. Returns `false` if the queue is empty. */
export function playNextInQueue() {
  const next = queue.shift();
  if (!next) return false;

  const watchEndpoint: Json = { videoId: next.videoId };
  // Keep playback parameters, but not a playlist the tile came from.
  if (next.watchEndpoint.params)
    watchEndpoint.params = next.watchEndpoint.params;

  showNotification(
    t('msg.queuePlaying', 'Next in queue: {title} ({count} left)', {
      title: next.title,
      count: String(queue.length)
    })
  );
  void dispatchCommand({ watchEndpoint });
  return true;
}

setCustomActionHandler('addToQueue', (params) => {
  addToQueue(params as unknown as QueuedVideo);
});

setCustomActionHandler('clearQueue', () => clearQueue());

setColorActionHandler('queueNext', () => {
  if (!playNextInQueue()) {
    showNotification(t('msg.queueEmpty', 'The queue is empty'));
  }
  return true;
});

const playerManager = await getPlayerManager();
const player = playerManager.player;

let endedVideo: string | null = null;

player.addEventListener('onStateChange', () => {
  if (queue.length === 0) return;
  if (playerManager.playerMode !== PlayerMode.NORMAL) return;

  const state = player.getPlayerStateObject();
  const videoId = playerManager.currentVideoID;
  if (!state.isEnded || !videoId || endedVideo === videoId) return;

  // Start before YouTube's own autoplay countdown runs out.
  endedVideo = videoId;
  setTimeout(() => {
    playNextInQueue();
  }, 300);
});

playerManager.addEventListener('newVideo', () => {
  endedVideo = null;
});

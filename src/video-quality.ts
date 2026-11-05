import { configRead } from './config';
import { getPlayerManager, PlayerMode } from './player_api';
import type { EventMapOf, PlayerManager, VideoID } from './player_api';
import { showNotification } from './ui';

const playerManager = await getPlayerManager();

function shouldForce() {
  return configRead('forceHighResVideo');
}

type EventMap = EventMapOf<PlayerManager>;

function getMaxQualityLabel(player: PlayerManager['player']) {
  return player.getAvailableQualityData()[0]?.qualityLabel;
}

function notifyPlaybackQuality(this: PlayerManager) {
  if (!shouldForce()) return;

  const player = this.player;

  const selected = player.getPlaybackQualityLabel();
  const max = getMaxQualityLabel(player);

  showNotification(`${selected} selected (Max ${max})`, 3000);

  this.removeEventListener('playbackStart', notifyPlaybackQuality);
}

/**
 * Run `cb` once the video is really playing: ready to play through and the
 * time has advanced. Changing the quality while the player is still
 * starting (or taking over an inline preview) left some TVs on the
 * loading animation.
 */
function whenPlaying(player: PlayerManager['player'], cb: () => void) {
  const video = player.querySelector('video');
  const start = video ? video.currentTime : 0;
  const started = Date.now();
  const token = window.setInterval(() => {
    const progressed =
      !video || (video.readyState >= 3 && video.currentTime > start + 0.5);
    if (progressed || Date.now() - started > 8000) {
      clearInterval(token);
      cb();
    }
  }, 250);
}

function setPlaybackQuality(this: PlayerManager, _: unknown) {
  if (this.playerMode === PlayerMode.PREVIEW) return;

  this.removeEventListener('playbackStart', setPlaybackQuality);
  whenPlaying(this.player, () => applyPlaybackQuality.call(this));
}

function applyPlaybackQuality(this: PlayerManager) {
  if (!shouldForce() || this.playerMode === PlayerMode.PREVIEW) return;

  const prevQuality = this.player.getPlaybackQualityLabel();
  const max = getMaxQualityLabel(this.player);

  // Already at the best quality: leave the player alone.
  if (!max || prevQuality === max) {
    notifyPlaybackQuality.call(this);
    return;
  }

  console.debug('[video-quality] setting playback quality');
  // Formats above the resolution cap are already removed from the response.
  this.player.setPlaybackQualityRange('highres', 'highres');

  let timeoutToken: number | undefined;

  // No reliable event for quality change, so poll for it
  const intervalToken = window.setInterval(() => {
    const currQuality = this.player.getPlaybackQualityLabel();
    if (currQuality !== prevQuality) {
      notifyPlaybackQuality.call(this);
      clearInterval(intervalToken);
      clearTimeout(timeoutToken);
    }
  }, 100);

  timeoutToken = window.setTimeout(() => {
    console.warn('[video-quality] timed out waiting for quality change');
    clearInterval(intervalToken);
    notifyPlaybackQuality.call(this);
  }, 3000);
}

function handleNewVideo(this: PlayerManager, _: EventMap['newVideo']) {
  if (!shouldForce()) return;

  this.removeEventListener('playbackStart', setPlaybackQuality);
  this.addEventListener('playbackStart', setPlaybackQuality);
}

playerManager.addEventListener('newVideo', handleNewVideo);

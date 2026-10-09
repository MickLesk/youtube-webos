/**
 * Applies a default playback speed to every video and lets the red button
 * cycle through speeds during playback. The chosen speed is remembered.
 */
import { configGetChoices, configRead, configWrite } from './config';
import { getPlayerManager, PlayerMode } from './player_api';
import type { PlayerManager } from './player_api';
import { setColorKeyHandler, showNotification } from './ui';

const playerManager = await getPlayerManager();

function getVideo() {
  return playerManager.player.querySelector('video');
}

/**
 * Prefer the player API so YouTube's own state (and speed menu) stays in
 * sync; fall back to the media element.
 */
function setRate(rate: number) {
  const player = playerManager.player;
  if (typeof player.setPlaybackRate === 'function') {
    player.setPlaybackRate(rate);
  }
  const video = getVideo();
  if (video && video.playbackRate !== rate) video.playbackRate = rate;
}

function getSpeed(): number {
  const speed = Number(configRead('defaultPlaybackSpeed'));
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

function applySpeed(this: PlayerManager) {
  this.removeEventListener('playbackStart', applySpeed);
  if (this.playerMode !== PlayerMode.NORMAL) return;

  const speed = getSpeed();
  if (getVideo()?.playbackRate !== speed) {
    setRate(speed);
    console.info('[playback-speed] set to', speed);
  }
}

playerManager.addEventListener('newVideo', function () {
  this.removeEventListener('playbackStart', applySpeed);
  this.addEventListener('playbackStart', applySpeed);
});

function isWatching() {
  return (
    document.body.classList.contains('WEB_PAGE_TYPE_WATCH') &&
    playerManager.playerMode === PlayerMode.NORMAL
  );
}

setColorKeyHandler('red', () => {
  if (!isWatching()) return false;

  const speeds = (configGetChoices('defaultPlaybackSpeed') ?? []).map(
    (c) => c.value as number
  );
  const current = getVideo()?.playbackRate ?? getSpeed();
  const index = speeds.findIndex((s) => s > current + 0.01);
  const next = speeds[index === -1 ? 0 : index] ?? 1;

  configWrite('defaultPlaybackSpeed', next);
  setRate(next);

  showNotification(`Playback speed: ${next}x`, 1500, 'red');
  return true;
});

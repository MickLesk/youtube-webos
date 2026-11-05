/**
 * Jumps to the end of the video as soon as the end screen (the suggestions
 * over the last seconds) starts, so autoplay or the queue continues right
 * away. The start time comes from the player response.
 */
import { configRead } from './config';
import { t } from './i18n';
import { getPlayerManager, PlayerMode } from './player_api';
import { getEndscreenStart } from './remove-endscreen';
import { runColorAction, showNotification } from './ui';
import { getQueueLength } from './video-queue';

const playerManager = await getPlayerManager();

/** The end screen is skipped once per video; seeking back shows it. */
let skippedFor: string | null = null;

function check() {
  if (!configRead('skipEndscreen')) return;
  if (playerManager.playerMode !== PlayerMode.NORMAL) return;
  const id = playerManager.currentVideoID;
  if (!id || skippedFor === id) return;
  const start = getEndscreenStart(id);
  if (start === undefined) return;

  const video = playerManager.player.querySelector('video');
  if (!video || video.paused || video.readyState < 3) return;
  const duration = video.duration;
  if (!isFinite(duration) || duration - start > 60) return;
  const time = video.currentTime;
  if (time < start || time >= duration - 0.5) return;

  skippedFor = id;
  showNotification(t('msg.endscreenSkipped', 'End screen skipped'), 2000);
  if (getQueueLength() > 0 && runColorAction('queueNext')) return;
  video.currentTime = duration;
}

document.addEventListener(
  'timeupdate',
  (evt) => {
    if (evt.target instanceof HTMLVideoElement) check();
  },
  true
);

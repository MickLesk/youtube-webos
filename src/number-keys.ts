/**
 * Number keys 0-9 jump to 0-90 % of the video, like on youtube.com.
 */
import { configRead } from './config';
import { getPlayerManager, PlayerMode } from './player_api';
import { showNotification } from './ui';

const playerManager = await getPlayerManager();

function digitOf(keyCode: number): number | null {
  if (keyCode >= 48 && keyCode <= 57) return keyCode - 48;
  if (keyCode >= 96 && keyCode <= 105) return keyCode - 96;
  return null;
}

function formatTime(seconds: number) {
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

document.addEventListener(
  'keydown',
  (evt) => {
    const digit = digitOf(evt.keyCode);
    if (digit === null || !configRead('numberKeySeek')) return;
    if (!document.body.classList.contains('WEB_PAGE_TYPE_WATCH')) return;
    if (playerManager.playerMode !== PlayerMode.NORMAL) return;
    if (playerManager.player.getVideoData().isLive) return;
    // Typing in one of our text fields.
    if (document.activeElement instanceof HTMLInputElement) return;

    const video = playerManager.player.querySelector('video');
    if (!video || !isFinite(video.duration)) return;

    video.currentTime = (video.duration * digit) / 10;
    showNotification(
      `${digit * 10} % (${formatTime(video.currentTime)})`,
      1500
    );
    evt.preventDefault();
    evt.stopPropagation();
  },
  true
);

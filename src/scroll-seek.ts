/**
 * Magic Remote scroll wheel seeking while the progress bar is focused.
 * Each notch moves 3% of the video, between 3 and 100 seconds.
 *
 * Based on the idea of webosbrew/youtube-webos#324.
 */
import { configRead } from './config';
import { t } from './i18n';
import { showNotification } from './ui';

function progressBarFocused() {
  return document.querySelector('.ytLrProgressBarFocused') !== null;
}

function handleWheel(evt: WheelEvent) {
  if (!configRead('enableScrollSeek') || !progressBarFocused()) return;

  const video = document.querySelector('video');
  if (!video || !Number.isFinite(video.duration) || !evt.deltaY) return;

  evt.preventDefault();
  evt.stopPropagation();

  const step = Math.min(100, Math.max(3, video.duration * 0.03));
  const delta = evt.deltaY > 0 ? -step : step;
  video.currentTime = Math.min(
    Math.max(video.currentTime + delta, 0),
    video.duration - 1
  );

  const rounded = Math.round(delta);
  showNotification(
    t('msg.seek', '{delta} s', {
      delta: rounded > 0 ? `+${rounded}` : rounded
    }),
    800
  );
}

// Not passive, so the page doesn't scroll at the same time.
window.addEventListener('wheel', handleWheel, {
  capture: true,
  passive: false
});

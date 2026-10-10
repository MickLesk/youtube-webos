/**
 * Shows the remaining time and when the video will end ("-12:34, ends
 * 22:14") while the player controls are visible. Accounts for the playback
 * speed.
 */
import { configRead } from './config';
import {
  addOverlayLine,
  isOverlayVisible,
  onOverlayVisibility
} from './player-overlay';

const { line, refresh } = addOverlayLine('ytaf-time-remaining');

const clockFormatter = new Intl.DateTimeFormat(navigator.language, {
  hour: 'numeric',
  minute: 'numeric'
});

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

let timer: number | undefined;

function render() {
  const video = document.querySelector('video');
  const enabled = configRead('showTimeRemaining');
  const duration = video?.duration;

  if (!enabled || !video || !duration || !Number.isFinite(duration)) {
    line.style.display = 'none';
    refresh();
    return;
  }

  const rate = video.playbackRate > 0 ? video.playbackRate : 1;
  const remaining = (duration - video.currentTime) / rate;
  const end = new Date(Date.now() + remaining * 1000);

  line.textContent = `-${formatDuration(remaining)}  ·  ends ${clockFormatter.format(end)}`;
  line.style.display = 'block';
  refresh();
}

onOverlayVisibility((visible) => {
  if (visible && timer === undefined) {
    render();
    timer = window.setInterval(() => {
      if (isOverlayVisible()) render();
    }, 1000);
  } else if (!visible && timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
});

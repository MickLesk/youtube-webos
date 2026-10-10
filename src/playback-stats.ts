/**
 * Playback statistics (resolution, codec, dropped frames, buffer) in the
 * player info box while the controls are visible.
 */
import { configRead, configWrite } from './config';
import { getPlayer } from './player_api/helpers';
import {
  addOverlayLine,
  isOverlayVisible,
  onOverlayVisibility
} from './player-overlay';
import { setColorActionHandler } from './ui';

const { line, refresh } = addOverlayLine('ytaf-playback-stats');

type StatsForNerds = Record<string, unknown>;

function nerdStats(): StatsForNerds | null {
  const player = document.querySelector('.html5-video-player') as
    (HTMLElement & { getStatsForNerds?: () => StatsForNerds }) | null;
  try {
    return player?.getStatsForNerds?.() ?? null;
  } catch {
    return null;
  }
}

function droppedFrames(video: HTMLVideoElement) {
  const quality = video.getVideoPlaybackQuality?.();
  if (quality)
    return `${quality.droppedVideoFrames}/${quality.totalVideoFrames}`;
  const legacy = video as HTMLVideoElement & {
    webkitDroppedFrameCount?: number;
    webkitDecodedFrameCount?: number;
  };
  return legacy.webkitDroppedFrameCount !== undefined
    ? `${legacy.webkitDroppedFrameCount}/${legacy.webkitDecodedFrameCount}`
    : '?';
}

function bufferAhead(video: HTMLVideoElement) {
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
      return buffered.end(i) - currentTime;
    }
  }
  return 0;
}

function render() {
  const video = document.querySelector('video');
  if (!configRead('showStats') || !video) {
    line.style.display = 'none';
    refresh();
    return;
  }

  const nerds = nerdStats();
  const codec =
    typeof nerds?.codecs === 'string' ? nerds.codecs.split(' ')[0] : null;
  const parts = [
    `${video.videoWidth}x${video.videoHeight}`,
    codec,
    `dropped ${droppedFrames(video)}`,
    `buffer ${bufferAhead(video).toFixed(1)} s`
  ];

  line.textContent = parts.filter(Boolean).join('  ·  ');
  line.style.display = 'block';
  refresh();
}

let timer: number | undefined;

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

setColorActionHandler('stats', () => {
  configWrite('showStats', !configRead('showStats'));
  render();
  return true;
});

// Make sure the player exists before the first render attempt.
void getPlayer().then(render);

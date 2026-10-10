/**
 * Picture-in-picture: the running video keeps playing in a small window in
 * the corner while browsing. The same button returns it to full screen.
 *
 * Adapted from https://github.com/reisxd/TizenTube
 * (mods/features/pictureInPicture.js)
 */
import { t } from './i18n';
import { dispatchCommand, getService } from './innertube';
import { getPlayerManager, PlayerMode } from './player_api';
import { setColorActionHandler, showNotification } from './ui';
import { onPageChange } from './page-state';

type Json = Record<string, unknown>;

interface PlayerService {
  loadedPlaybackConfig?: Json & { watchEndpoint?: Json };
  loadVideo(config: Json): void;
}

interface PreviewService {
  start(...args: unknown[]): unknown;
  stop(...args: unknown[]): unknown;
}

const playerManager = await getPlayerManager();

let pipActive = false;
let previewsPatched = false;

/** Tile previews would replace the video in the PiP window. */
function patchPreviews() {
  if (previewsPatched) return;
  const previews = getService<PreviewService>('PlaybackPreviewService');
  if (!previews) return;
  previewsPatched = true;

  const start = previews.start;
  const stop = previews.stop;
  previews.start = function (...args: unknown[]) {
    if (pipActive) return undefined;
    return start.apply(this, args);
  };
  previews.stop = function (...args: unknown[]) {
    if (pipActive) return undefined;
    return stop.apply(this, args);
  };
}

function videoElement() {
  return document.querySelector('video');
}

function playerContainer() {
  return document.querySelector('ytlr-player-container') as HTMLElement | null;
}

function setPipStyles(on: boolean) {
  document.body.classList.toggle('ytaf-pip', on);
  const container = playerContainer();
  const video = videoElement();
  if (!container || !video) return;

  if (on) {
    container.style.zIndex = '10';
    const ytlrPlayer = document.querySelector(
      'ytlr-player'
    ) as HTMLElement | null;
    if (ytlrPlayer) {
      ytlrPlayer.style.display = 'block';
      ytlrPlayer.style.backgroundColor = 'transparent';
    }
    video.style.removeProperty('inset');
    video.style.width = `${window.innerWidth / 3.5}px`;
    video.style.height = `${window.innerHeight / 3.5}px`;
    video.style.top = '68vh';
    video.style.left = '68vw';
  } else {
    container.style.removeProperty('z-index');
    const ytlrPlayer = document.querySelector(
      'ytlr-player'
    ) as HTMLElement | null;
    if (ytlrPlayer) {
      ytlrPlayer.style.removeProperty('display');
      ytlrPlayer.style.removeProperty('background-color');
    }
    for (const prop of ['width', 'height', 'top', 'left']) {
      video.style.removeProperty(prop);
    }
  }
}

function enterPip() {
  const service = getService<PlayerService>('PlayerService');
  const config = service?.loadedPlaybackConfig;
  const video = videoElement();
  if (!service || !config?.watchEndpoint || !video) {
    showNotification(
      t('msg.pipUnavailable', 'Picture-in-picture is not available')
    );
    return;
  }
  patchPreviews();

  const time = Math.floor(video.currentTime);
  const ytlrPlayer = document.querySelector('ytlr-player');

  // Leave the watch page, then load the same video again once the player
  // is no longer shown full screen.
  const observer = new MutationObserver(() => {
    if (!ytlrPlayer || ytlrPlayer.classList.contains('ytLrPlayerEnabled')) {
      return;
    }
    observer.disconnect();
    pipActive = true;

    const onPlay = () => {
      video.removeEventListener('play', onPlay);
      setPipStyles(true);
    };
    video.addEventListener('play', onPlay);

    setTimeout(() => {
      config.watchEndpoint!.startTimeSeconds = time;
      service.loadVideo(config);
      setPipStyles(true);
    }, 1000);
  });
  if (ytlrPlayer) observer.observe(ytlrPlayer, { attributes: true });

  void dispatchCommand({ signalAction: { signal: 'HISTORY_BACK' } });
}

function exitPip() {
  const service = getService<PlayerService>('PlayerService');
  const config = service?.loadedPlaybackConfig;
  const video = videoElement();
  pipActive = false;
  setPipStyles(false);

  if (config?.watchEndpoint) {
    const watchEndpoint = { ...config.watchEndpoint };
    if (video) watchEndpoint.startTimeSeconds = Math.floor(video.currentTime);
    void dispatchCommand({
      clickTrackingParams: config.clickTrackingParams,
      commandMetadata: config.commandMetadata,
      watchEndpoint
    });
  }
}

setColorActionHandler('pip', () => {
  if (pipActive) {
    exitPip();
    return true;
  }
  if (
    !document.body.classList.contains('WEB_PAGE_TYPE_WATCH') ||
    playerManager.playerMode !== PlayerMode.NORMAL
  ) {
    return false;
  }
  enterPip();
  return true;
});

// Opening a video while the small window runs brings back the normal player.
onPageChange((page) => {
  if (pipActive && page === 'WATCH') {
    pipActive = false;
    setPipStyles(false);
  }
});

/**
 * Picture adjustments for the video only: zoom to cut off black bars, and
 * brightness, contrast and saturation filters. Applied as classes and an
 * inline style on <body>, so YouTube's own player styles stay untouched.
 */
import {
  configAddChangeListener,
  configGetChoices,
  configRead,
  configWrite
} from './config';
import { t } from './i18n';
import { isWatchPage, onPageChange } from './page-state';
import { getPlayerManager, PlayerMode } from './player_api';
import { setColorActionHandler, showNotification } from './ui';

const ZOOM_CLASS: Record<string, string> = {
  fill: 'ytaf-zoom-fill',
  zoom: 'ytaf-zoom-zoom'
};

const playerManager = await getPlayerManager();

function filterValue() {
  const brightness = Number(configRead('videoBrightness')) || 100;
  const contrast = Number(configRead('videoContrast')) || 100;
  const saturation = Number(configRead('videoSaturation'));
  const parts: string[] = [];
  if (brightness !== 100) parts.push(`brightness(${brightness / 100})`);
  if (contrast !== 100) parts.push(`contrast(${contrast / 100})`);
  if (Number.isFinite(saturation) && saturation !== 100) {
    parts.push(`saturate(${saturation / 100})`);
  }
  return parts.join(' ');
}

function apply() {
  const body = document.body;
  // Only the real player: previews and Shorts keep their picture.
  const active =
    isWatchPage() && playerManager.playerMode !== PlayerMode.PREVIEW;
  const zoom = String(configRead('videoZoom'));
  for (const key of Object.keys(ZOOM_CLASS)) {
    body.classList.toggle(ZOOM_CLASS[key]!, active && key === zoom);
  }
  // Set on the element itself: webOS 3 has no CSS variables.
  const filter = active ? filterValue() : '';
  const video = playerManager.player.querySelector('video');
  if (video && video.style.filter !== filter) video.style.filter = filter;
}

export function zoomLabel() {
  const value = configRead('videoZoom');
  const choice = (configGetChoices('videoZoom') ?? []).filter(
    (c) => c.value === value
  )[0];
  return choice ? t(`choice.${choice.label}`, choice.label) : String(value);
}

for (const key of [
  'videoZoom',
  'videoBrightness',
  'videoContrast',
  'videoSaturation'
]) {
  configAddChangeListener(key, apply);
}
onPageChange(apply);
playerManager.addEventListener('newVideo', apply);
playerManager.addEventListener('playbackStart', apply);
apply();

/** Cycle the zoom with a color button. */
setColorActionHandler('zoom', () => {
  if (!isWatchPage() || playerManager.playerMode !== PlayerMode.NORMAL) {
    return false;
  }
  const choices = configGetChoices('videoZoom') ?? [];
  const value = configRead('videoZoom');
  let index = 0;
  for (let i = 0; i < choices.length; i++) {
    if (choices[i]!.value === value) index = i;
  }
  const next = choices[(index + 1) % choices.length];
  // Written through the config so the settings panel and quick menu agree.
  if (next) configWrite('videoZoom', next.value);
  showNotification(
    t('msg.zoom', 'Picture: {value}', {
      value: next ? t(`choice.${next.label}`, next.label) : ''
    }),
    1500
  );
  return true;
});

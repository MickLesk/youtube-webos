/**
 * Left/right seek by a fixed step while the player controls are hidden.
 * With the controls visible YouTube's own seek bar handles the keys.
 */
import { configRead } from './config';
import { t } from './i18n';
import { isOptionsPanelVisible } from './options-panel.js';
import { showNotification } from './ui';

const KEY_LEFT = 37;
const KEY_RIGHT = 39;

function controlsHidden() {
  const player = document.querySelector('ytlr-watch-default');
  return player?.getAttribute('hybridnavfocusable') === 'true';
}

function handleKey(evt: KeyboardEvent) {
  if (evt.keyCode !== KEY_LEFT && evt.keyCode !== KEY_RIGHT) return;

  const step = Number(configRead('seekStep')) || 0;
  if (!step || isOptionsPanelVisible()) return;
  if (!document.body.classList.contains('WEB_PAGE_TYPE_WATCH')) return;
  if (!controlsHidden()) return;

  const video = document.querySelector('video');
  if (!video || !Number.isFinite(video.duration)) return;

  evt.preventDefault();
  evt.stopPropagation();
  if (evt.type !== 'keydown') return;

  const delta = evt.keyCode === KEY_RIGHT ? step : -step;
  video.currentTime = Math.min(
    Math.max(video.currentTime + delta, 0),
    video.duration - 1
  );
  showNotification(
    t('msg.seek', '{delta} s', { delta: delta > 0 ? `+${delta}` : delta }),
    800
  );
}

for (const type of ['keydown', 'keyup'] as const) {
  document.addEventListener(type, handleKey, true);
}

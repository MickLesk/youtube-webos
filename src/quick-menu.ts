/**
 * A row of shortcuts at the bottom of the screen while watching: speed,
 * subtitles, audio-only, sleep timer, resolution, statistics, queue and
 * picture-in-picture. Opened with a color button.
 */
import { configGetChoices, configRead, configWrite } from './config';
import { t } from './i18n';
import { getPlayerManager, PlayerMode } from './player_api';
import { getQueueLength } from './video-queue';
import { runColorAction, setColorActionHandler } from './ui';
import { isWatchPage, onPageChange } from './page-state';

const AUTO_CLOSE_MS = 8000;

const playerManager = await getPlayerManager();
const player = playerManager.player as typeof playerManager.player & {
  toggleSubtitles?: () => void;
  isSubtitlesOn?: () => boolean;
};

interface Item {
  label: () => string;
  run: () => void;
  available?: () => boolean;
  /** Close the menu after running. */
  closes?: boolean;
}

function choiceLabel(key: string) {
  const value = configRead(key);
  const choice = (configGetChoices(key) ?? []).filter(
    (c) => c.value === value
  )[0];
  return choice ? t(`choice.${choice.label}`, choice.label) : String(value);
}

function cycleChoice(key: string) {
  const choices = configGetChoices(key) ?? [];
  const value = configRead(key);
  let index = 0;
  for (let i = 0; i < choices.length; i++) {
    if (choices[i]!.value === value) index = i;
  }
  const next = choices[(index + 1) % choices.length];
  if (next) configWrite(key, next.value);
}

const onOff = (on: boolean) => (on ? t('msg.on', 'On') : t('msg.off', 'Off'));

const ITEMS: Item[] = [
  {
    label: () =>
      t('quick.speed', 'Speed: {speed}x', {
        speed: document.querySelector('video')?.playbackRate ?? 1
      }),
    run: () => runColorAction('speed')
  },
  {
    label: () =>
      t('quick.subtitles', 'Subtitles: {state}', {
        state: onOff(!!player.isSubtitlesOn?.())
      }),
    run: () => player.toggleSubtitles?.(),
    available: () =>
      typeof player.toggleSubtitles === 'function' &&
      typeof player.isSubtitlesOn === 'function'
  },
  {
    label: () =>
      t('quick.audioOnly', 'Audio only: {state}', {
        state: onOff(document.body.classList.contains('ytaf-audio-only'))
      }),
    run: () => runColorAction('audioOnly')
  },
  {
    label: () =>
      t('quick.sleep', 'Sleep timer: {value}', {
        value: choiceLabel('sleepTimer')
      }),
    run: () => cycleChoice('sleepTimer')
  },
  {
    label: () =>
      t('quick.resolution', 'Max. resolution: {value}', {
        value: choiceLabel('maxResolution')
      }),
    run: () => cycleChoice('maxResolution')
  },
  {
    label: () =>
      t('quick.stats', 'Statistics: {state}', {
        state: onOff(!!configRead('showStats'))
      }),
    run: () => configWrite('showStats', !configRead('showStats'))
  },
  {
    label: () => t('quick.chapter', 'Next chapter'),
    run: () => runColorAction('nextChapter')
  },
  {
    label: () =>
      t('quick.queue', 'Next in queue ({count})', { count: getQueueLength() }),
    run: () => runColorAction('queueNext'),
    available: () => getQueueLength() > 0,
    closes: true
  },
  {
    label: () => t('quick.pip', 'Picture-in-picture'),
    run: () => runColorAction('pip'),
    closes: true
  }
];

const bar = document.createElement('div');
bar.className = 'ytaf-quick-menu';
bar.style.display = 'none';
document.body.appendChild(bar);

let visible = false;
let lastKeyDown: number | null = null;
let focusIndex = 0;
let shown: Item[] = [];
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function render() {
  bar.textContent = '';
  shown.forEach((item, index) => {
    const elm = document.createElement('div');
    elm.className =
      'ytaf-quick-item' +
      (index === focusIndex ? ' ytaf-quick-item-focused' : '');
    elm.textContent = item.label();
    bar.appendChild(elm);
  });
}

function scheduleClose() {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(close, AUTO_CLOSE_MS);
}

function open() {
  shown = ITEMS.filter((item) => !item.available || item.available());
  focusIndex = Math.min(focusIndex, shown.length - 1);
  visible = true;
  bar.style.display = 'block';
  render();
  scheduleClose();
}

function close() {
  visible = false;
  clearTimeout(closeTimer);
  bar.style.display = 'none';
}

function activate() {
  const item = shown[focusIndex];
  if (!item) return;
  item.run();
  if (item.closes) {
    close();
    return;
  }
  // Some actions change their state asynchronously.
  render();
  setTimeout(render, 300);
}

const isColorKey = (evt: KeyboardEvent) =>
  evt.keyCode >= 403 && evt.keyCode <= 406;

window.addEventListener(
  'keydown',
  (evt) => {
    if (!visible || isColorKey(evt)) return;
    lastKeyDown = evt.keyCode;
    scheduleClose();
    switch (evt.keyCode) {
      case 37:
        focusIndex = (focusIndex + shown.length - 1) % shown.length;
        render();
        break;
      case 39:
        focusIndex = (focusIndex + 1) % shown.length;
        render();
        break;
      case 13:
        activate();
        break;
      default:
        // Back, up, down and everything else close the menu.
        close();
    }
    evt.preventDefault();
    evt.stopPropagation();
  },
  true
);
for (const type of ['keypress', 'keyup']) {
  window.addEventListener(
    type,
    (evt) => {
      const { keyCode } = evt as KeyboardEvent;
      if (isColorKey(evt as KeyboardEvent)) return;
      // Also the release of the key that closed the menu.
      if (visible || keyCode === lastKeyDown) evt.stopPropagation();
      if (evt.type === 'keyup' && keyCode === lastKeyDown) lastKeyDown = null;
    },
    true
  );
}

setColorActionHandler('quickMenu', () => {
  if (visible) {
    close();
    return true;
  }
  if (!isWatchPage() || playerManager.playerMode !== PlayerMode.NORMAL) {
    return false;
  }
  open();
  return true;
});

// Leaving the watch page closes the menu.
onPageChange(() => {
  if (visible && !isWatchPage()) close();
});

import { configAddChangeListener, configRead } from './config.js';
import { t } from './i18n';
import {
  isOptionsPanelVisible,
  setCurrentChannelProvider,
  setKeyLegendProvider,
  showOptionsPanel
} from './options-panel.js';
import './ui.css';
import { requireElement } from './player_api/helpers';

export { setCurrentChannelProvider };

// We handle key events ourselves.
window.__spatialNavigation__.keyMode = 'NONE';

const colorCodeMap = new Map([
  [403, 'red'],

  [404, 'green'],
  [172, 'green'],

  [405, 'yellow'],
  [170, 'yellow'],

  [406, 'blue'],
  [167, 'blue'],
  [191, 'blue']
]);

/**
 * Returns the name of the color button associated with a code or null if not a color button.
 * @param {number} charCode KeyboardEvent.charCode property from event
 * @returns {string | null} Color name or null
 */
function getKeyColor(charCode) {
  if (colorCodeMap.has(charCode)) {
    return colorCodeMap.get(charCode);
  }

  return null;
}

window.ytaf_showOptionsPanel = showOptionsPanel;

const COLOR_BUTTONS = ['red', 'yellow', 'blue'];

/** @type {Map<string, () => boolean>} */
const colorActionHandlers = new Map();

/**
 * Register the handler of a color button action ('speed', 'sponsorblock',
 * 'audioOnly'). The viewer picks which button triggers which action. The
 * handler returns `true` if it used the press; otherwise YouTube gets it.
 * @param {string} action
 * @param {() => boolean} handler
 */
export function setColorActionHandler(action, handler) {
  colorActionHandlers.set(action, handler);
}

/**
 * Label of the button currently mapped to `action`, e.g. "[YELLOW]", or
 * `null` if no button triggers it.
 * @param {string} action
 */
export function getButtonLabel(action) {
  const color = COLOR_BUTTONS.find((c) => configRead(`${c}Button`) === action);
  return color ? t(`color.${color}`, `[${color.toUpperCase()}]`) : null;
}

const ACTION_LABELS = {
  speed: 'Cycle playback speed',
  sponsorblock: 'SponsorBlock skip/highlight',
  audioOnly: 'Audio-only mode',
  nextChapter: 'Next chapter',
  stats: 'Toggle playback statistics'
};

setKeyLegendProvider(() => {
  const parts = [
    `${t('color.green', '[GREEN]')} ${t('ui.keyGreen', 'Settings')}`
  ];
  for (const color of COLOR_BUTTONS) {
    const label = ACTION_LABELS[configRead(`${color}Button`)];
    if (label) {
      parts.push(
        `${t(`color.${color}`, `[${color.toUpperCase()}]`)} ${t(`choice.${label}`, label)}`
      );
    }
  }
  return parts.join('   ');
});

let colorKeyConsumed = false;

const eventHandler = (evt) => {
  console.debug(
    'Key event:',
    evt.type,
    evt.charCode,
    evt.keyCode,
    evt.defaultPrevented
  );

  const color = getKeyColor(evt.charCode);

  if (color === 'green') {
    console.debug('Taking over!');

    evt.preventDefault();
    evt.stopPropagation();

    if (evt.type === 'keydown') {
      // Toggle visibility.
      showOptionsPanel(!isOptionsPanelVisible());
    }
    return false;
  }

  if (!color || isOptionsPanelVisible()) return true;

  const handler = colorActionHandlers.get(configRead(`${color}Button`));
  if (!handler) return true;

  // Decide on keydown and swallow the matching keypress/keyup as well.
  if (evt.type === 'keydown') {
    colorKeyConsumed = handler();
  }
  if (colorKeyConsumed) {
    evt.preventDefault();
    evt.stopPropagation();
    return false;
  }
  return true;
};

document.addEventListener('keydown', eventHandler, true);
document.addEventListener('keypress', eventHandler, true);
document.addEventListener('keyup', eventHandler, true);

const COLOR_MAP = {
  red: 'rgba(255, 0, 0, 0.9)',
  green: 'rgba(0, 162, 0, 0.9)',
  yellow: 'rgba(255, 255, 0, 0.9)',
  blue: 'rgba(0, 128, 255, 0.9)',
  grey: 'rgba(255, 255, 255, 0.5)',
  none: 'rgba(0, 0, 0, 0)'
};

const NOTIFICATION_POSITIONS = [
  'bottom-right',
  'top-right',
  'bottom-left',
  'top-left'
];

function getNotificationContainer() {
  let c = document.querySelector('.ytaf-notification-container');
  if (!c) {
    console.debug('Adding notification container');
    c = document.createElement('div');
    c.classList.add('ytaf-notification-container');
    document.body.appendChild(c);
  }

  const position = configRead('notificationPosition');
  for (const p of NOTIFICATION_POSITIONS) {
    c.classList.toggle(`ytaf-notification-${p}`, p === position);
  }
  return c;
}

export function showNotification(text, time = 3000, color = 'grey') {
  const container = getNotificationContainer();
  time *= Number(configRead('notificationDuration')) || 1;

  const elm = document.createElement('div');
  const elmInner = document.createElement('div');
  elmInner.innerText = text;
  elmInner.classList.add('message');
  elmInner.classList.add('message-hidden');
  elm.appendChild(elmInner);
  container.appendChild(elm);
  elmInner.style.borderColor = COLOR_MAP[color] || color;

  setTimeout(() => {
    elmInner.classList.remove('message-hidden');
  }, 100);
  setTimeout(() => {
    elmInner.classList.add('message-hidden');
    setTimeout(() => {
      elm.remove();
    }, 1000);
  }, time);
}

/**
 * Initialize ability to hide YouTube logo in top right corner.
 */
function initHideLogo() {
  const style = document.createElement('style');
  document.head.appendChild(style);

  /** @type {(hide: boolean) => void} */
  const setHidden = (hide) => {
    const visibility = hide ? 'hidden' : 'visible';
    style.textContent = `ytlr-redux-connect-ytlr-logo-entity { visibility: ${visibility}; }`;
  };

  setHidden(configRead('hideLogo'));

  configAddChangeListener('hideLogo', (evt) => {
    setHidden(evt.detail.newValue);
  });
}

function applyUIFixes() {
  try {
    const bodyClasses = document.body.classList;

    const observer = new MutationObserver(function bodyClassCallback(
      _records,
      _observer
    ) {
      try {
        if (bodyClasses.contains('app-quality-root')) {
          bodyClasses.remove('app-quality-root');
        }
      } catch (e) {
        console.error('error in <body> class observer callback:', e);
      }
    });

    observer.observe(document.body, {
      subtree: false,
      childList: false,
      attributes: true,
      attributeFilter: ['class'],
      characterData: false
    });
  } catch (e) {
    console.error('error setting up <body> class observer:', e);
  }
}

let audioOnlyEnabled = false;
let overlayObserver = null;

/* Optional black screen while in audio-only mode (saves OLED panels). */
const DIM_DELAY_MS = 10000;
const dimOverlay = document.createElement('div');
dimOverlay.className = 'ytaf-dim';
dimOverlay.style.display = 'none';
document.body.appendChild(dimOverlay);
let dimTimer;

function scheduleDim() {
  clearTimeout(dimTimer);
  dimOverlay.style.display = 'none';
  if (audioOnlyEnabled && configRead('audioOnlyDim')) {
    dimTimer = setTimeout(() => {
      dimOverlay.style.display = 'block';
    }, DIM_DELAY_MS);
  }
}

document.addEventListener(
  'keydown',
  (evt) => {
    const wasDimmed = dimOverlay.style.display !== 'none';
    scheduleDim();
    if (wasDimmed) {
      // The first press only wakes the screen.
      evt.preventDefault();
      evt.stopPropagation();
    }
  },
  true
);

async function initAudioOnlyToggle() {
  audioOnlyEnabled = !audioOnlyEnabled;
  // A class on <body> survives YouTube rewriting the <video> style when the
  // next video in a playlist starts, unlike an inline style.
  document.body.classList.toggle('ytaf-audio-only', audioOnlyEnabled);
  scheduleDim();

  const AUDIO_OVERLAY_SELECTOR = '.ytLrAudioPlayerOverlayAudioMode';
  const YTAF_OVERLAY_CLASS = 'ytaf-ui-watchControl-overlayMessage';

  const applyAudioOverlayFilter = () => {
    const node = document.querySelector(AUDIO_OVERLAY_SELECTOR);
    if (!node) return;
    if (audioOnlyEnabled) {
      node.style.setProperty('filter', 'brightness(0)', 'important');
    } else {
      node.style.removeProperty('filter');
    }
  };
  applyAudioOverlayFilter();

  showNotification(
    t('msg.audioOnly', 'Audio-only mode: {state}', {
      state: audioOnlyEnabled ? t('msg.on', 'On') : t('msg.off', 'Off')
    }),
    2000,
    'blue'
  );

  const controlsContainer = await requireElement(
    '[idomkey="controls"]',
    HTMLElement
  );

  const updateOverlay = (root = controlsContainer) => {
    let overlay = root.querySelector(`.${YTAF_OVERLAY_CLASS}`);

    if (!audioOnlyEnabled) {
      overlay?.remove();
      return;
    }

    if (overlay) return;

    overlay = Object.assign(document.createElement('div'), {
      textContent: t(
        'msg.audioOnlyOverlay',
        'Audio-only mode enabled - press {button} to toggle',
        { button: getButtonLabel('audioOnly') ?? '' }
      ),
      className: YTAF_OVERLAY_CLASS
    });
    root.prepend(overlay);
  };
  updateOverlay();

  if (overlayObserver) overlayObserver.disconnect();
  overlayObserver = new MutationObserver(() => {
    updateOverlay();
    applyAudioOverlayFilter();
  });

  overlayObserver.observe(controlsContainer, {
    childList: true,
    subtree: true
  });
}

setColorActionHandler('audioOnly', () => {
  initAudioOnlyToggle();
  return true;
});

applyUIFixes();
initHideLogo();

setTimeout(() => {
  showNotification(
    t('msg.openSettings', 'Press [GREEN] to open the settings'),
    2000,
    'green'
  );
});

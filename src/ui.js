/*global navigate, __YTAF_VERSION__*/
import './spatial-navigation-polyfill.js';
import {
  configAddChangeListener,
  configRead,
  configWrite,
  configGetChoices,
  configGetDesc,
  configGetHelp,
  configResetAll
} from './config.js';
import { clearLogEntries, getLogEntries } from './logger';
import './ui.css';
import { requireElement } from './player_api/helpers';

// We handle key events ourselves.
window.__spatialNavigation__.keyMode = 'NONE';

const ARROW_KEY_CODE = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

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

function createConfigCheckbox(key) {
  const elmInput = document.createElement('input');
  elmInput.type = 'checkbox';
  elmInput.checked = configRead(key);

  /** @type {(evt: Event) => void} */
  const changeHandler = (evt) => {
    configWrite(key, evt.target.checked);
  };

  elmInput.addEventListener('change', changeHandler);

  configAddChangeListener(key, (evt) => {
    elmInput.checked = evt.detail.newValue;
  });

  const elmLabel = document.createElement('label');
  elmLabel.setAttribute('data-config-key', key);
  elmLabel.appendChild(elmInput);
  // Use non-breaking space (U+00A0)
  elmLabel.appendChild(document.createTextNode('\u00A0' + configGetDesc(key)));

  return elmLabel;
}

/**
 * Scroll `container` so that `elm` is fully visible. Done manually because
 * scrollIntoView options are not supported on older webOS versions.
 * @param {HTMLElement} container
 * @param {EventTarget | null} elm
 */
function scrollIntoContainer(container, elm) {
  if (!(elm instanceof HTMLElement) || elm === container) return;

  const containerRect = container.getBoundingClientRect();
  const elmRect = elm.getBoundingClientRect();

  if (elmRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - elmRect.top;
  } else if (elmRect.bottom > containerRect.bottom) {
    container.scrollTop += elmRect.bottom - containerRect.bottom;
  }
}

/**
 * A button that cycles through the choices of a config option on OK.
 * @param {string} key
 */
function createConfigChoice(key) {
  const choices = configGetChoices(key);
  const elmButton = document.createElement('button');
  elmButton.className = 'ytaf-ui-choice';
  elmButton.setAttribute('data-config-key', key);

  const render = () => {
    const value = configRead(key);
    const choice = choices.find((c) => c.value === value) ?? choices[0];
    elmButton.textContent = `${configGetDesc(key)}: ${choice.label}`;
  };

  elmButton.addEventListener('click', () => {
    const index = choices.findIndex((c) => c.value === configRead(key));
    configWrite(key, choices[(index + 1) % choices.length].value);
  });

  configAddChangeListener(key, render);
  render();

  return elmButton;
}

/** @param {string} key */
function createConfigControl(key) {
  return configGetChoices(key)
    ? createConfigChoice(key)
    : createConfigCheckbox(key);
}

/**
 * @param {string} title
 * @param {string[]} keys
 */
function createSection(title, keys) {
  const elmSection = document.createElement('div');
  const elmTitle = document.createElement('h2');
  elmTitle.textContent = title;
  elmSection.appendChild(elmTitle);

  for (const key of keys) {
    elmSection.appendChild(createConfigControl(key));
  }

  return elmSection;
}

/** @type {(() => string | null) | null} */
let currentChannelProvider = null;

/**
 * Register a function that returns the channel name of the video being
 * watched, used by the "block channel" button in the options panel.
 * @param {() => string | null} provider
 */
export function setCurrentChannelProvider(provider) {
  currentChannelProvider = provider;
}

function createBlockedChannelsSection() {
  const elmSection = document.createElement('div');
  const elmTitle = document.createElement('h2');
  elmTitle.textContent = 'Blocked channels';
  elmSection.appendChild(elmTitle);

  const elmList = document.createElement('div');
  elmSection.appendChild(elmList);

  const elmBlock = document.createElement('button');
  elmBlock.className = 'ytaf-ui-choice';
  elmSection.appendChild(elmBlock);

  const getChannel = () => currentChannelProvider?.() || null;

  const render = () => {
    const blocked = configRead('blockedChannels');
    elmList.textContent = '';

    if (!blocked.length) {
      const elmEmpty = document.createElement('small');
      elmEmpty.textContent = 'None. Open this panel while watching to block.';
      elmList.appendChild(elmEmpty);
    }

    for (const name of blocked) {
      const elmItem = document.createElement('button');
      elmItem.className = 'ytaf-ui-choice';
      elmItem.textContent = `Unblock: ${name}`;
      elmItem.addEventListener('click', () => {
        configWrite(
          'blockedChannels',
          configRead('blockedChannels').filter((c) => c !== name)
        );
      });
      elmList.appendChild(elmItem);
    }

    const channel = getChannel();
    elmBlock.style.display =
      channel && !blocked.includes(channel) ? '' : 'none';
    elmBlock.textContent = `Block channel: ${channel ?? ''}`;
  };

  elmBlock.addEventListener('click', () => {
    const channel = getChannel();
    if (!channel) return;
    const blocked = configRead('blockedChannels');
    if (!blocked.includes(channel)) {
      configWrite('blockedChannels', [...blocked, channel]);
    }
  });

  configAddChangeListener('blockedChannels', render);
  elmSection.addEventListener('ytaf-refresh', render);
  render();

  return elmSection;
}

/** @type {HTMLElement | null} */
let helpElement = null;

/**
 * Show the help text of the focused control in the panel footer.
 * @param {EventTarget | null} target
 */
function showHelpFor(target) {
  if (!helpElement) return;
  // Element.closest() is missing on webOS 3, so walk up manually.
  let node = target instanceof HTMLElement ? target : null;
  while (node && !node.hasAttribute('data-config-key')) {
    node = node.parentElement;
  }
  const key = node?.getAttribute('data-config-key');
  helpElement.textContent = key ? (configGetHelp(key) ?? '') : '';
}

function formatTime(date) {
  const pad = (n) => (n < 10 ? '0' : '') + n;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function createDiagnosticsSection() {
  const elmSection = document.createElement('div');
  const elmTitle = document.createElement('h2');
  elmTitle.textContent = 'Diagnostics';
  elmSection.appendChild(elmTitle);

  const elmLog = document.createElement('div');
  elmLog.className = 'ytaf-ui-log';
  elmSection.appendChild(elmLog);

  const render = () => {
    const entries = getLogEntries().slice(-15).reverse();
    elmLog.textContent = '';

    if (!entries.length) {
      elmLog.textContent = 'No warnings or errors logged.';
      return;
    }

    for (const entry of entries) {
      const elmEntry = document.createElement('div');
      elmEntry.className = `ytaf-ui-log-${entry.level}`;
      elmEntry.textContent = `${formatTime(entry.time)} [${entry.source}] ${entry.message}`;
      elmLog.appendChild(elmEntry);
    }
  };

  const elmClear = document.createElement('button');
  elmClear.className = 'ytaf-ui-choice';
  elmClear.textContent = 'Clear log';
  elmClear.addEventListener('click', () => {
    clearLogEntries();
    render();
  });
  elmSection.appendChild(elmClear);

  // Two presses needed, so a stray OK can't wipe the settings.
  let resetArmed = false;
  let resetTimer;
  const elmReset = document.createElement('button');
  elmReset.className = 'ytaf-ui-choice';
  elmReset.textContent = 'Reset all settings';
  elmReset.addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      elmReset.textContent = 'Press OK again to reset all settings';
      resetTimer = setTimeout(() => {
        resetArmed = false;
        elmReset.textContent = 'Reset all settings';
      }, 5000);
      return;
    }
    clearTimeout(resetTimer);
    configResetAll();
    window.location.reload();
  });
  elmSection.appendChild(elmReset);

  elmSection.addEventListener('ytaf-refresh', render);
  render();

  return elmSection;
}

function createOptionsPanel() {
  const elmContainer = document.createElement('div');

  elmContainer.classList.add('ytaf-ui-container');
  elmContainer.style['display'] = 'none';
  elmContainer.setAttribute('tabindex', 0);

  elmContainer.addEventListener(
    'focus',
    (evt) => {
      console.debug('Options panel focused!');
      scrollIntoContainer(elmBody, evt.target);
      showHelpFor(evt.target);
    },
    true
  );
  elmContainer.addEventListener(
    'blur',
    () => console.debug('Options panel blurred!'),
    true
  );

  elmContainer.addEventListener(
    'keydown',
    (evt) => {
      console.debug('Options panel key event:', evt.type, evt.charCode);

      if (getKeyColor(evt.charCode) === 'green') {
        return;
      }

      if (evt.keyCode in ARROW_KEY_CODE) {
        navigate(ARROW_KEY_CODE[evt.keyCode]);
      } else if (evt.keyCode === 13) {
        // "OK" button

        /**
         * The YouTube app generates these "OK" events from clicks (including
         * with the Magic Remote), and we don't want to send a duplicate click
         * event for those. Youtube uses the `Event` class instead of
         * `KeyboardEvent` so we check for that.
         * See issue #143 and #200 for context.
         */
        if (evt instanceof KeyboardEvent) {
          document.activeElement.click();
        }
      } else if (evt.keyCode === 27) {
        // Back button
        showOptionsPanel(false);
      }

      evt.preventDefault();
      evt.stopPropagation();
    },
    true
  );

  const elmHeading = document.createElement('h1');
  elmHeading.textContent = 'webOS YouTube Extended';
  elmContainer.appendChild(elmHeading);

  const elmBody = document.createElement('div');
  elmBody.className = 'ytaf-ui-body';
  elmContainer.appendChild(elmBody);

  elmBody.appendChild(
    createSection('General', [
      'enableAdBlock',
      'autoAccountSelect',
      'startPage',
      'hideYouThere',
      'hideNags',
      'mutePreviews'
    ])
  );

  elmBody.appendChild(
    createSection('Playback', [
      'defaultPlaybackSpeed',
      'sleepTimer',
      'showTimeRemaining',
      'forceHighResVideo',
      'videoCodec',
      'maxResolution',
      'forceOriginalAudio',
      'disableAutoCaptions',
      'removeEndscreen',
      'enableLiveCatchup',
      'enableReturnDislike'
    ])
  );

  elmBody.appendChild(
    createSection('Feeds', [
      'removeShorts',
      'hideWatchedVideos',
      'hideLiveStreams',
      'hideUpcoming',
      'hideMembersOnly',
      'upgradeThumbnails',
      'enableDeArrow',
      'enableDeArrowThumbnails'
    ])
  );

  elmBody.appendChild(createBlockedChannelsSection());

  elmBody.appendChild(
    createSection('Appearance', [
      'hideLogo',
      'showWatch',
      'showWatchAlways',
      'oledTheme',
      'disableAnimations'
    ])
  );

  elmBody.appendChild(createSection('SponsorBlock', ['enableSponsorBlock']));

  const elmBlock = document.createElement('blockquote');
  for (const key of [
    'enableSponsorBlockSponsor',
    'enableSponsorBlockIntro',
    'enableSponsorBlockOutro',
    'enableSponsorBlockInteraction',
    'enableSponsorBlockSelfPromo',
    'enableSponsorBlockMusicOfftopic',
    'enableSponsorBlockPreview',
    'enableSponsorBlockFiller',
    'enableSponsorBlockHighlight',
    'enableSponsorBlockNotifications'
  ]) {
    elmBlock.appendChild(createConfigControl(key));
  }

  elmBody.appendChild(elmBlock);

  const elmSponsorLink = document.createElement('small');
  elmSponsorLink.className = 'ytaf-ui-sponsor';
  elmSponsorLink.textContent =
    'Sponsor segments skipping - https://sponsor.ajay.app';
  elmBody.appendChild(elmSponsorLink);

  elmBody.appendChild(createDiagnosticsSection());

  const elmFooter = document.createElement('div');
  elmFooter.className = 'ytaf-ui-footer';
  elmContainer.appendChild(elmFooter);

  const elmHelp = document.createElement('div');
  elmHelp.className = 'ytaf-ui-help';
  elmFooter.appendChild(elmHelp);
  helpElement = elmHelp;

  const elmKeys = document.createElement('div');
  elmKeys.className = 'ytaf-ui-keys';
  elmKeys.textContent =
    '[GREEN] settings   [RED] speed   [YELLOW] SponsorBlock skip/highlight   [BLUE] audio only';
  elmFooter.appendChild(elmKeys);

  const version = document.createElement('div');
  version.className = 'ytaf-ui-version';
  version.textContent = `v${__YTAF_VERSION__}`;

  elmFooter.appendChild(version);

  return elmContainer;
}

const optionsPanel = createOptionsPanel();
document.body.appendChild(optionsPanel);

let optionsPanelVisible = false;

/**
 * Show or hide the options panel.
 * @param {boolean} [visible=true] Whether to show the options panel.
 */
function showOptionsPanel(visible) {
  visible ??= true;

  if (visible && !optionsPanelVisible) {
    console.debug('Showing and focusing options panel!');
    optionsPanel.style.display = 'block';
    for (const elm of optionsPanel.querySelectorAll('div')) {
      elm.dispatchEvent(new CustomEvent('ytaf-refresh'));
    }
    optionsPanel.focus();
    optionsPanelVisible = true;
  } else if (!visible && optionsPanelVisible) {
    console.debug('Hiding options panel!');
    optionsPanel.style.display = 'none';
    optionsPanel.blur();
    optionsPanelVisible = false;
  }
}

window.ytaf_showOptionsPanel = showOptionsPanel;

let colorKeyConsumed = false;

/** @type {Map<string, () => boolean>} */
const colorKeyHandlers = new Map();

/**
 * Handle presses of a color button outside the options panel. The handler
 * returns `true` if it consumed the press; otherwise YouTube gets the key.
 * @param {'red' | 'yellow'} color
 * @param {() => boolean} handler
 */
export function setColorKeyHandler(color, handler) {
  colorKeyHandlers.set(color, handler);
}

const eventHandler = (evt) => {
  console.debug(
    'Key event:',
    evt.type,
    evt.charCode,
    evt.keyCode,
    evt.defaultPrevented
  );

  if (getKeyColor(evt.charCode) === 'green') {
    console.debug('Taking over!');

    evt.preventDefault();
    evt.stopPropagation();

    if (evt.type === 'keydown') {
      // Toggle visibility.
      showOptionsPanel(!optionsPanelVisible);
    }
    return false;
  } else if (getKeyColor(evt.charCode) === 'blue') {
    evt.preventDefault();
    evt.stopPropagation();

    if (evt.type === 'keydown') {
      // Toggle Audio-Only mode.
      initAudioOnlyToggle();
    }
    return false;
  }

  const color = getKeyColor(evt.charCode);
  const handler = color && colorKeyHandlers.get(color);
  if (handler && !optionsPanelVisible) {
    // Decide on keydown and swallow the matching keypress/keyup as well.
    if (evt.type === 'keydown') {
      colorKeyConsumed = handler();
    }
    if (colorKeyConsumed) {
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
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

export function showNotification(text, time = 3000, color = 'grey') {
  if (!document.querySelector('.ytaf-notification-container')) {
    console.debug('Adding notification container');
    const c = document.createElement('div');
    c.classList.add('ytaf-notification-container');
    document.body.appendChild(c);
  }

  const elm = document.createElement('div');
  const elmInner = document.createElement('div');
  elmInner.innerText = text;
  elmInner.classList.add('message');
  elmInner.classList.add('message-hidden');
  elm.appendChild(elmInner);
  document.querySelector('.ytaf-notification-container').appendChild(elm);
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

async function initAudioOnlyToggle() {
  audioOnlyEnabled = !audioOnlyEnabled;
  // A class on <body> survives YouTube rewriting the <video> style when the
  // next video in a playlist starts, unlike an inline style.
  document.body.classList.toggle('ytaf-audio-only', audioOnlyEnabled);

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
    `Audio-Only mode: ${audioOnlyEnabled ? 'Enabled' : 'Disabled'}`,
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
      textContent: 'Audio-Only Mode Enabled - Press [BLUE] to toggle',
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

applyUIFixes();
initHideLogo();

setTimeout(() => {
  showNotification(
    'Press [GREEN] to open YTAF configuration screen',
    2000,
    'green'
  );
});

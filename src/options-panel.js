/*global __YTAF_VERSION__*/
/**
 * The settings panel opened with the green button.
 *
 * Layout: a sidebar with the pages on the left, the options of the page in
 * the middle (one row per option, grouped under headings) and a help column
 * on the right. Every row carries a `data-config-key` (or `data-help`) so the
 * help column can explain it.
 */
import {
  configAddChangeListener,
  configRead,
  configWrite,
  configGetChoices,
  configGetDefault,
  configGetDesc,
  configGetHelp,
  configResetAll
} from './config.js';
import {
  getChannelSettings,
  getChannelsWithSettings,
  removeChannelSettings,
  setChannelSetting
} from './channel-settings';
import {
  formatDuration,
  getSkipStats,
  resetSkipStats
} from './sponsorblock-stats';
import { t } from './i18n';
import { clearLogEntries, createLogger, getLogEntries } from './logger';
import './spatial-navigation-polyfill.js';
import './options-panel.css';

const logger = createLogger('options-panel');

const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_ENTER = 13;
const KEY_BACK = 27;
const KEY_BACK_WEBOS = 461;

/** @param {string} key */
function optionLabel(key) {
  return t(`opt.${key}`, configGetDesc(key));
}

/** @param {string} label */
function choiceLabel(label) {
  return t(`choice.${label}`, label);
}

/** @param {string} key */
function optionHelp(key) {
  const isSponsorBlockMode =
    key.startsWith('enableSponsorBlock') && configGetChoices(key);
  return isSponsorBlockMode
    ? t('help.sponsorBlockMode', configGetHelp(key) ?? '')
    : t(`help.${key}`, configGetHelp(key) ?? '');
}

/* ------------------------------ New options ----------------------------- */

const SEEN_KEY = 'ytaf-seen-options';

/**
 * Options added in the release before the "new" badges existed. They stay
 * marked as new once for people updating from an older version.
 */
const RECENT_OPTIONS = [
  'subtitleAutoTranslate',
  'subtitleSize',
  'subtitleBackground',
  'subtitlePosition',
  'perAccountSettings',
  'subscriptionsOnHome'
];

/** @type {string[] | null} */
let seenOptions = null;

function loadSeen() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? 'null');
    return Array.isArray(stored) ? stored : null;
  } catch {
    return null;
  }
}

function saveSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(seenOptions));
  } catch {
    // Storage full or unavailable: badges simply come back next time.
  }
}

/**
 * On the first run every option counts as seen, so a fresh install shows no
 * badges. Updates from a version without badges keep RECENT_OPTIONS new.
 * @param {string[]} keys All options shown in the panel
 */
function initSeen(keys) {
  seenOptions = loadSeen();
  if (seenOptions) return;
  const isUpdate = window.localStorage.getItem('ytaf-configuration') !== null;
  seenOptions = keys.filter(
    (key) => !isUpdate || RECENT_OPTIONS.indexOf(key) === -1
  );
  saveSeen();
}

/** @param {string} key */
function isNewOption(key) {
  return !!seenOptions && seenOptions.indexOf(key) === -1;
}

/** @param {string} key */
function markSeen(key) {
  if (!isNewOption(key)) return;
  seenOptions.push(key);
  saveSeen();
}

/* ----------------------------- Controls ----------------------------- */

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 */
function el(tag, className, text) {
  const elm = document.createElement(tag);
  if (className) elm.className = className;
  if (text !== undefined) elm.textContent = text;
  return elm;
}

/**
 * A row with a label on the left and a value on the right.
 * @param {string} label
 * @param {string} [key] Config key for the help column and the badge
 */
function createRow(label, key) {
  const elmRow = el('button', 'ytaf-ui-row');
  const elmLabel = el('span', 'ytaf-ui-row-label', label);
  const elmValue = el('span', 'ytaf-ui-row-value');
  elmRow.appendChild(elmLabel);
  elmRow.appendChild(elmValue);

  if (key) {
    elmRow.setAttribute('data-config-key', key);
    if (isNewOption(key)) {
      const elmBadge = el('span', 'ytaf-ui-badge', t('ui.new', 'New'));
      elmLabel.appendChild(elmBadge);
      // Seen once it was focused; the badge goes when the focus moves on.
      elmRow.addEventListener('blur', () => {
        if (isNewOption(key)) return;
        if (elmBadge.parentNode) elmBadge.parentNode.removeChild(elmBadge);
      });
    }
  }

  return { row: elmRow, value: elmValue };
}

/** @param {string} key */
function createConfigToggle(key) {
  const { row, value } = createRow(optionLabel(key), key);
  row.className += ' ytaf-ui-row-toggle';

  const elmToggle = el('span', 'ytaf-ui-toggle');
  elmToggle.appendChild(el('span', 'ytaf-ui-knob'));
  value.appendChild(elmToggle);

  const render = () => {
    elmToggle.classList.toggle('ytaf-ui-toggle-on', !!configRead(key));
  };

  row.addEventListener('click', () => configWrite(key, !configRead(key)));
  configAddChangeListener(key, render);
  render();

  return row;
}

/**
 * Left/right step through the choices, OK moves to the next one.
 * @param {string} key
 */
function createConfigChoice(key) {
  const choices = configGetChoices(key);
  const { row, value } = createRow(optionLabel(key), key);
  row.className += ' ytaf-ui-row-choice';

  const elmText = el('span', 'ytaf-ui-choice-text');
  value.appendChild(el('span', 'ytaf-ui-arrow', '‹'));
  value.appendChild(elmText);
  value.appendChild(el('span', 'ytaf-ui-arrow', '›'));

  const indexOfValue = () => {
    const current = configRead(key);
    for (let i = 0; i < choices.length; i++) {
      if (choices[i].value === current) return i;
    }
    return 0;
  };

  const render = () => {
    elmText.textContent = choiceLabel(choices[indexOfValue()].label);
  };

  /** @param {number} direction 1 or -1 */
  const step = (direction) => {
    const next = (indexOfValue() + direction + choices.length) % choices.length;
    configWrite(key, choices[next].value);
  };

  row.ytafStep = step;
  row.addEventListener('click', () => step(1));
  configAddChangeListener(key, render);
  render();

  return row;
}

/** @param {string} key */
function createConfigControl(key) {
  return configGetChoices(key)
    ? createConfigChoice(key)
    : createConfigToggle(key);
}

/**
 * A row that runs an action, used by the list editors and other sections.
 * @param {string} text
 * @param {() => void} onClick
 * @param {string} [key] Config key for the help column
 */
function createButton(text, onClick, key) {
  const elmButton = el('button', 'ytaf-ui-row ytaf-ui-row-action', text);
  if (key) elmButton.setAttribute('data-config-key', key);
  elmButton.addEventListener('click', onClick);
  return elmButton;
}

/** @param {string} text */
function createHeading(text) {
  return el('h2', 'ytaf-ui-heading', text);
}

/**
 * A heading and one row per option.
 * @param {string} title English group title, translated as `ui.group.<title>`
 * @param {string[]} keys
 */
function createGroup(title, keys) {
  const elmGroup = el('div', 'ytaf-ui-group');
  elmGroup.appendChild(createHeading(t(`ui.group.${title}`, title)));
  for (const key of keys) elmGroup.appendChild(createConfigControl(key));
  return elmGroup;
}

/**
 * Editor for a config option holding a list of strings: a text field to add
 * entries and one button per entry to remove it.
 * @param {string} key
 */
function createListEditor(key) {
  const elmSection = el('div', 'ytaf-ui-group');
  elmSection.appendChild(createHeading(optionLabel(key)));

  const elmInput = document.createElement('input');
  elmInput.type = 'text';
  elmInput.className = 'ytaf-ui-text';
  elmInput.placeholder = t('ui.inputHint', 'Type a word, then OK');
  elmInput.setAttribute('data-config-key', key);
  elmSection.appendChild(elmInput);

  const elmList = el('div');

  const add = () => {
    const value = elmInput.value.trim();
    elmInput.value = '';
    if (!value) return;
    const list = configRead(key);
    const exists = list.some((v) => v.toLowerCase() === value.toLowerCase());
    if (!exists) configWrite(key, [...list, value]);
  };

  elmInput.addEventListener('keydown', (evt) => {
    if (evt.keyCode === KEY_ENTER) add();
  });
  elmSection.appendChild(createButton(t('ui.add', 'Add'), add, key));
  elmSection.appendChild(elmList);

  const render = () => {
    elmList.textContent = '';
    const list = configRead(key);
    if (!list.length) {
      elmList.appendChild(
        el('div', 'ytaf-ui-empty', t('ui.listEmpty', 'No entries yet.'))
      );
    }
    for (const value of list) {
      elmList.appendChild(
        createButton(
          t('ui.remove', 'Remove: {name}', { name: value }),
          () => {
            configWrite(
              key,
              configRead(key).filter((v) => v !== value)
            );
          },
          key
        )
      );
    }
  };

  configAddChangeListener(key, render);
  render();

  return elmSection;
}

/* --------------------------- Blocked channels --------------------------- */

/** @type {(() => string | null) | null} */
let currentChannelProvider = null;

/**
 * Register a function that returns the channel name of the video being
 * watched, used by the "block channel" button.
 * @param {() => string | null} provider
 */
export function setCurrentChannelProvider(provider) {
  currentChannelProvider = provider;
}

function createBlockedChannelsSection() {
  const key = 'blockedChannels';
  const elmSection = el('div', 'ytaf-ui-group');
  elmSection.appendChild(
    createHeading(t('ui.blockedChannels', 'Blocked channels'))
  );

  const elmList = document.createElement('div');
  elmSection.appendChild(elmList);

  const getChannel = () => currentChannelProvider?.() || null;

  const elmBlock = createButton(
    '',
    () => {
      const channel = getChannel();
      if (!channel) return;
      const blocked = configRead(key);
      if (!blocked.includes(channel)) configWrite(key, [...blocked, channel]);
    },
    key
  );
  elmSection.appendChild(elmBlock);

  const render = () => {
    const blocked = configRead(key);
    elmList.textContent = '';

    if (!blocked.length) {
      const elmEmpty = el('div', 'ytaf-ui-empty');
      elmEmpty.textContent = t(
        'ui.blockedChannelsEmpty',
        'None. Open this panel while watching to block that channel.'
      );
      elmList.appendChild(elmEmpty);
    }

    for (const name of blocked) {
      elmList.appendChild(
        createButton(
          t('ui.unblock', 'Unblock: {name}', { name }),
          () => {
            configWrite(
              key,
              configRead(key).filter((c) => c !== name)
            );
          },
          key
        )
      );
    }

    const channel = getChannel();
    elmBlock.style.display =
      channel && !blocked.includes(channel) ? '' : 'none';
    elmBlock.textContent = t('ui.blockChannel', 'Block channel: {name}', {
      name: channel ?? ''
    });
  };

  configAddChangeListener(key, render);
  elmSection.addEventListener('ytaf-refresh', render);
  render();

  return elmSection;
}

/* --------------------------- Channel settings --------------------------- */

const CHANNEL_SPEEDS = [undefined, 0.75, 1, 1.25, 1.5, 1.75, 2];
const CHANNEL_RESOLUTIONS = [undefined, 2160, 1440, 1080, 720, 480];

function resolutionLabel(height) {
  return height === 2160 ? '4K' : `${height}p`;
}

function describeChannelSettings(settings) {
  const parts = [];
  if (settings.speed) parts.push(`${settings.speed}x`);
  if (settings.maxResolution) {
    parts.push(resolutionLabel(settings.maxResolution));
  }
  if (settings.noSponsorBlock) {
    parts.push(t('ui.channelNoSponsorBlock', 'no SponsorBlock'));
  }
  return parts.join(', ');
}

function createChannelSection() {
  const elmSection = el('div', 'ytaf-ui-group');
  const elmHeading = createHeading('');
  elmSection.appendChild(elmHeading);

  const getChannel = () => currentChannelProvider?.() || null;

  const elmSpeed = createButton(
    '',
    () => {
      const channel = getChannel();
      if (!channel) return;
      const current = getChannelSettings(channel).speed;
      const index = CHANNEL_SPEEDS.indexOf(current);
      const next = CHANNEL_SPEEDS[(index + 1) % CHANNEL_SPEEDS.length];
      setChannelSetting(channel, 'speed', next);
    },
    'channelSettings'
  );
  const elmResolution = createButton(
    '',
    () => {
      const channel = getChannel();
      if (!channel) return;
      const current = getChannelSettings(channel).maxResolution;
      const index = CHANNEL_RESOLUTIONS.indexOf(current);
      const next =
        CHANNEL_RESOLUTIONS[(index + 1) % CHANNEL_RESOLUTIONS.length];
      setChannelSetting(channel, 'maxResolution', next);
    },
    'channelSettings'
  );
  const elmSponsor = createButton(
    '',
    () => {
      const channel = getChannel();
      if (!channel) return;
      const off = !!getChannelSettings(channel).noSponsorBlock;
      setChannelSetting(channel, 'noSponsorBlock', off ? undefined : true);
    },
    'channelSettings'
  );
  elmSection.appendChild(elmSpeed);
  elmSection.appendChild(elmResolution);
  elmSection.appendChild(elmSponsor);

  const elmList = document.createElement('div');
  elmSection.appendChild(elmList);

  const render = () => {
    const channel = getChannel();
    elmHeading.textContent = channel
      ? t('ui.channelSettingsFor', 'This channel: {name}', { name: channel })
      : t('ui.channelSettings', 'Channel settings');
    elmSpeed.style.display = channel ? '' : 'none';
    elmSponsor.style.display = channel ? '' : 'none';
    elmResolution.style.display = channel ? '' : 'none';

    if (channel) {
      const settings = getChannelSettings(channel);
      elmSpeed.textContent = t(
        'ui.channelSpeed',
        'Speed for this channel: {speed}',
        {
          speed: settings.speed
            ? `${settings.speed}x`
            : t('ui.default', 'Default')
        }
      );
      elmResolution.textContent = t(
        'ui.channelResolution',
        'Max. resolution for this channel: {value}',
        {
          value: settings.maxResolution
            ? resolutionLabel(settings.maxResolution)
            : t('ui.default', 'Default')
        }
      );
      elmSponsor.textContent = t(
        'ui.channelSponsorBlock',
        'SponsorBlock for this channel: {state}',
        {
          state: settings.noSponsorBlock
            ? t('msg.off', 'Off')
            : t('msg.on', 'On')
        }
      );
    }

    elmList.textContent = '';
    const channels = getChannelsWithSettings();
    if (!channels.length && !channel) {
      const elmEmpty = el('div', 'ytaf-ui-empty');
      elmEmpty.textContent = t(
        'ui.channelSettingsEmpty',
        'Open this panel while watching to set speed or SponsorBlock for that channel.'
      );
      elmList.appendChild(elmEmpty);
    }
    for (const name of channels) {
      elmList.appendChild(
        createButton(
          t('ui.channelReset', 'Reset: {name} ({settings})', {
            name,
            settings: describeChannelSettings(getChannelSettings(name))
          }),
          () => removeChannelSettings(name),
          'channelSettings'
        )
      );
    }
  };

  configAddChangeListener('channelSettings', render);
  elmSection.addEventListener('ytaf-refresh', render);
  render();

  return elmSection;
}

/* ------------------------- SponsorBlock stats ------------------------- */

function createSkipStatsSection() {
  const elmSection = el('div', 'ytaf-ui-group');
  const elmStats = document.createElement('div');
  elmStats.className = 'ytaf-ui-log';
  elmSection.appendChild(elmStats);

  const render = () => {
    const stats = getSkipStats();
    elmStats.textContent = t(
      'ui.timeSaved',
      'Time saved: {time} ({count} segments skipped)',
      { time: formatDuration(stats.seconds), count: stats.count }
    );
  };

  elmSection.appendChild(
    createButton(t('ui.resetTimeSaved', 'Reset time saved'), () => {
      resetSkipStats();
      render();
    })
  );

  elmSection.addEventListener('ytaf-refresh', render);
  render();
  return elmSection;
}

/* ----------------------------- Diagnostics ----------------------------- */

function formatTime(date) {
  const pad = (n) => (n < 10 ? '0' : '') + n;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** @type {(() => string[])[]} */
const diagnosticsProviders = [];

/**
 * Add status lines to the Diagnostics page (self-test, updates).
 * @param {() => string[]} provider
 */
export function addDiagnosticsLines(provider) {
  diagnosticsProviders.push(provider);
}

function createDiagnosticsSection() {
  const elmSection = el('div', 'ytaf-ui-group');

  const elmStatus = document.createElement('div');
  elmStatus.className = 'ytaf-ui-log';
  elmSection.appendChild(elmStatus);
  const renderStatus = () => {
    elmStatus.textContent = '';
    for (const provider of diagnosticsProviders) {
      for (const text of provider()) {
        const elmLine = document.createElement('div');
        elmLine.textContent = text;
        elmStatus.appendChild(elmLine);
      }
    }
  };

  const elmLog = document.createElement('div');
  elmLog.className = 'ytaf-ui-log';

  const render = () => {
    const entries = getLogEntries().slice(-15).reverse();
    elmLog.textContent = '';

    if (!entries.length) {
      elmLog.textContent = t('ui.noLog', 'No warnings or errors logged.');
      return;
    }

    for (const entry of entries) {
      const elmEntry = document.createElement('div');
      elmEntry.className = `ytaf-ui-log-${entry.level}`;
      elmEntry.textContent = `${formatTime(entry.time)} [${entry.source}] ${entry.message}`;
      elmLog.appendChild(elmEntry);
    }
  };

  elmSection.appendChild(
    createButton(t('ui.clearLog', 'Clear log'), () => {
      clearLogEntries();
      render();
    })
  );

  // Two presses needed, so a stray OK can't wipe the settings.
  let resetArmed = false;
  let resetTimer;
  const resetText = t('ui.reset', 'Reset all settings');
  const elmReset = createButton(resetText, () => {
    if (!resetArmed) {
      resetArmed = true;
      elmReset.textContent = t(
        'ui.resetConfirm',
        'Press OK again to reset all settings'
      );
      resetTimer = setTimeout(() => {
        resetArmed = false;
        elmReset.textContent = resetText;
      }, 5000);
      return;
    }
    clearTimeout(resetTimer);
    configResetAll();
    window.location.reload();
  });
  elmSection.appendChild(elmReset);
  elmSection.appendChild(elmLog);

  elmSection.addEventListener('ytaf-refresh', renderStatus);
  renderStatus();
  elmSection.addEventListener('ytaf-refresh', render);
  render();

  return elmSection;
}

/* ------------------------------- Presets ------------------------------- */

/** Options presets never touch. */
const PRESET_SKIP = ['language', 'perAccountSettings'];

const PRESETS = [
  {
    id: 'recommended',
    title: 'Recommended',
    help: 'Defaults plus the most popular extras: no Shorts, muted previews, no end screens, remaining time, dislikes and sharper thumbnails.',
    value: (key, def) => {
      const extras = {
        removeShorts: true,
        mutePreviews: true,
        removeEndscreen: true,
        showTimeRemaining: true,
        enableReturnDislike: true,
        upgradeThumbnails: true
      };
      return key in extras ? extras[key] : def;
    }
  },
  {
    id: 'minimal',
    title: 'Minimal',
    help: 'Only ad blocking, SponsorBlock and no "Are you still watching?". Everything else off.',
    value: (key, def) => {
      const on = [
        'enableAdBlock',
        'enableSponsorBlock',
        'sponsorBlockSkipOnce',
        'enableSponsorBlockNotifications',
        'hideYouThere',
        'checkForUpdates'
      ];
      return typeof def === 'boolean' ? on.indexOf(key) !== -1 : def;
    }
  },
  {
    id: 'off',
    title: 'Everything off',
    help: 'Turns every extra off and gives the color buttons back to YouTube. Lists of blocked channels and words stay.',
    value: (key, def) => {
      if (typeof def === 'boolean') return false;
      if (/Button$/.test(key)) return 'none';
      return def;
    }
  }
];

/** @type {string[]} */
let presetKeys = [];

function applyPreset(preset) {
  for (const key of presetKeys) {
    if (PRESET_SKIP.indexOf(key) !== -1) continue;
    const value = preset.value(key, configGetDefault(key));
    if (JSON.stringify(configRead(key)) !== JSON.stringify(value)) {
      configWrite(key, value);
    }
  }
}

function createPresetGroup() {
  const elmGroup = el('div', 'ytaf-ui-group');
  elmGroup.appendChild(createHeading(t('ui.group.Quick setup', 'Quick setup')));

  for (const preset of PRESETS) {
    const { row, value } = createRow(t(`ui.preset.${preset.id}`, preset.title));
    row.className += ' ytaf-ui-row-preset';
    row.setAttribute('data-help', t(`ui.presetHelp.${preset.id}`, preset.help));

    const idle = t('ui.apply', 'Apply');
    value.textContent = idle;

    // Two presses needed, so a stray OK can't change everything.
    let armed = false;
    let timer;
    const reset = (text) => {
      armed = false;
      row.classList.remove('ytaf-ui-row-armed');
      value.textContent = text;
    };
    row.addEventListener('click', () => {
      clearTimeout(timer);
      if (!armed) {
        armed = true;
        row.classList.add('ytaf-ui-row-armed');
        value.textContent = t('ui.confirm', 'OK again to apply');
        timer = setTimeout(() => reset(idle), 5000);
        return;
      }
      applyPreset(preset);
      reset(t('ui.applied', 'Applied'));
      timer = setTimeout(() => reset(idle), 3000);
    });
    row.addEventListener('blur', () => {
      if (armed) reset(idle);
    });

    elmGroup.appendChild(row);
  }

  return elmGroup;
}

/* -------------------------------- Pages -------------------------------- */

/**
 * 24x24 icons (Material Design, Apache 2.0).
 * @type {Record<string, string>}
 */
const ICONS = {
  General: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  Playback: 'M8 5v14l11-7z',
  Feeds:
    'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  Blocking:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z',
  Appearance:
    'M12 3a9 9 0 000 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  Buttons:
    'M7 4a3 3 0 100 6 3 3 0 000-6zm10 0a3 3 0 100 6 3 3 0 000-6zM7 14a3 3 0 100 6 3 3 0 000-6zm10 0a3 3 0 100 6 3 3 0 000-6z',
  SponsorBlock: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  Diagnostics:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
};

/**
 * @typedef {{ title: string, groups?: [string, string[]][],
 *   before?: () => HTMLElement, after?: () => HTMLElement, help: string }} Page
 */

/** @type {Page[]} */
const PAGES = [
  {
    title: 'General',
    help: 'Quick setup, language, start and the things YouTube interrupts you with.',
    before: createPresetGroup,
    groups: [
      [
        'Start and account',
        ['language', 'autoAccountSelect', 'startPage', 'perAccountSettings']
      ],
      [
        'Interruptions',
        ['enableAdBlock', 'hideYouThere', 'hideNags', 'mutePreviews']
      ],
      ['App', ['enhancedLongPress', 'checkForUpdates']]
    ]
  },
  {
    title: 'Playback',
    help: 'Quality, speed, subtitles and controls while watching.',
    groups: [
      [
        'Video',
        [
          'defaultPlaybackSpeed',
          'forceHighResVideo',
          'videoCodec',
          'maxResolution',
          'forceOriginalAudio',
          'removeEndscreen',
          'rememberPosition'
        ]
      ],
      [
        'Subtitles',
        [
          'disableAutoCaptions',
          'subtitleLanguage',
          'subtitleAutoTranslate',
          'subtitleSize',
          'subtitleBackground',
          'subtitlePosition'
        ]
      ],
      [
        'Controls',
        ['seekStep', 'enableScrollSeek', 'numberKeySeek', 'sleepTimer']
      ],
      [
        'Display',
        [
          'showTimeRemaining',
          'showStats',
          'audioOnlyDim',
          'enableReturnDislike'
        ]
      ],
      ['Live', ['enableLiveCatchup', 'enableLiveChat']]
    ],
    after: createChannelSection
  },
  {
    title: 'Feeds',
    help: 'What shows up on Home, in Subscriptions and next to videos.',
    groups: [
      [
        'Filter',
        [
          'removeShorts',
          'hideWatchedVideos',
          'hideLiveStreams',
          'hideUpcoming',
          'hideMembersOnly',
          'minVideoLength',
          'hideWatchRecommendations'
        ]
      ],
      [
        'Subscriptions',
        ['cleanSubscriptions', 'subscriptionsOnHome', 'sortSubscriptions']
      ],
      [
        'Thumbnails and titles',
        [
          'disablePreviews',
          'upgradeThumbnails',
          'enableDeArrow',
          'enableDeArrowThumbnails'
        ]
      ]
    ]
  },
  {
    title: 'Blocking',
    help: 'Hide channels, words in titles and whole shelves.',
    before: () => {
      const elmPage = el('div');
      elmPage.appendChild(createBlockedChannelsSection());
      elmPage.appendChild(createListEditor('blockedKeywords'));
      elmPage.appendChild(createListEditor('hiddenShelves'));
      return elmPage;
    }
  },
  {
    title: 'Appearance',
    help: 'Clock, notifications and the look of the app.',
    groups: [
      [
        'Clock',
        ['showWatch', 'showWatchAlways', 'clockFormat', 'clockShowDate']
      ],
      ['Notifications', ['notificationPosition', 'notificationDuration']],
      ['Interface', ['hideLogo', 'oledTheme', 'twemoji', 'disableAnimations']]
    ]
  },
  {
    title: 'Buttons',
    help: 'What the red, yellow and blue buttons do. Green always opens this menu.',
    groups: [['Color buttons', ['redButton', 'yellowButton', 'blueButton']]]
  },
  {
    title: 'SponsorBlock',
    help: 'Skip sponsors, intros and other segments reported by the community.',
    groups: [
      [
        'SponsorBlock',
        [
          'enableSponsorBlock',
          'sponsorBlockMinLength',
          'sponsorBlockSkipOnce',
          'enableSponsorBlockNotifications',
          'enableSponsorBlockHighlight'
        ]
      ],
      [
        'Categories',
        [
          'enableSponsorBlockSponsor',
          'enableSponsorBlockIntro',
          'enableSponsorBlockOutro',
          'enableSponsorBlockInteraction',
          'enableSponsorBlockSelfPromo',
          'enableSponsorBlockMusicOfftopic',
          'enableSponsorBlockPreview',
          'enableSponsorBlockFiller'
        ]
      ]
    ],
    after: () => {
      const elmSection = createSkipStatsSection();
      elmSection.appendChild(
        el('div', 'ytaf-ui-empty ytaf-ui-sponsor', 'https://sponsor.ajay.app')
      );
      return elmSection;
    }
  },
  {
    title: 'Diagnostics',
    help: 'Self-test, update status, warnings and a full reset.',
    before: createDiagnosticsSection
  }
];

/** @param {Page} page */
function pageKeys(page) {
  const keys = [];
  for (const group of page.groups ?? []) {
    for (const key of group[1]) keys.push(key);
  }
  return keys;
}

/** @param {Page} page */
function buildPage(page) {
  const elmPage = el('div', 'ytaf-ui-page');
  if (page.before) elmPage.appendChild(page.before());
  for (const group of page.groups ?? []) {
    elmPage.appendChild(createGroup(group[0], group[1]));
  }
  if (page.after) elmPage.appendChild(page.after());
  return elmPage;
}

/* -------------------------------- Panel -------------------------------- */

/**
 * Scroll `container` so that `elm` is fully visible. Done manually because
 * scrollIntoView options are not supported on older webOS versions.
 * @param {HTMLElement} container
 * @param {EventTarget | null} elm
 */
function scrollIntoContainer(container, elm) {
  if (!(elm instanceof HTMLElement) || !container.contains(elm)) return;

  const containerRect = container.getBoundingClientRect();
  const elmRect = elm.getBoundingClientRect();
  // Keep a bit of the neighbours (and group headings) in view.
  const margin = Math.min(elmRect.height * 1.5, containerRect.height / 4);

  if (elmRect.top - margin < containerRect.top) {
    container.scrollTop -= containerRect.top - elmRect.top + margin;
  } else if (elmRect.bottom + margin > containerRect.bottom) {
    container.scrollTop += elmRect.bottom - containerRect.bottom + margin;
  }
}

/**
 * The nearest element (itself included) carrying `attr`. Element.closest()
 * is missing on webOS 3, so walk up manually.
 * @param {EventTarget | null} target
 * @param {string} attr
 * @returns {HTMLElement | null}
 */
function withAttribute(target, attr) {
  let node = target instanceof HTMLElement ? target : null;
  while (node && !node.hasAttribute(attr)) node = node.parentElement;
  return node;
}

/** @param {EventTarget | null} target */
function focusableOf(target) {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node.tagName !== 'BUTTON' && node.tagName !== 'INPUT') {
    node = node.parentElement;
  }
  return node;
}

/** @type {(() => string) | null} */
let keyLegendProvider = null;

/**
 * Register the function that describes the color button layout for the
 * help column.
 * @param {() => string} provider
 */
export function setKeyLegendProvider(provider) {
  keyLegendProvider = provider;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Builds an SVG element by element: YouTube enforces Trusted Types, so
 * assigning markup to innerHTML throws.
 * @param {string} viewBox
 * @param {[string, Record<string, string>][]} shapes
 */
function createSvg(viewBox, shapes) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  for (const [tag, attrs] of shapes) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const name in attrs) shape.setAttribute(name, attrs[name]);
    svg.appendChild(shape);
  }
  return svg;
}

/** @param {string} name */
function createIcon(name) {
  const elmIcon = el('span', 'ytaf-ui-icon');
  elmIcon.appendChild(
    createSvg('0 0 24 24', [['path', { fill: 'currentColor', d: ICONS[name] }]])
  );
  return elmIcon;
}

function createLogo() {
  const elmLogo = el('span', 'ytaf-ui-logo');
  elmLogo.appendChild(
    createSvg('0 0 28 20', [
      ['rect', { width: '28', height: '20', rx: '5', fill: '#ff0033' }],
      ['path', { d: 'M11 5.5v9l7.5-4.5z', fill: '#fff' }]
    ])
  );
  return elmLogo;
}

let currentPage = 0;

function createOptionsPanel() {
  const allKeys = [];
  for (const page of PAGES) {
    for (const key of pageKeys(page)) allKeys.push(key);
  }
  presetKeys = allKeys;
  if (!seenOptions) initSeen(allKeys);

  const elmContainer = el('div', 'ytaf-ui-container');
  elmContainer.style.display = 'none';
  elmContainer.setAttribute('tabindex', 0);

  /* Header */
  const elmHeader = el('div', 'ytaf-ui-header');
  elmHeader.appendChild(createLogo());
  elmHeader.appendChild(el('span', 'ytaf-ui-title', 'YouTube Extended'));
  elmHeader.appendChild(el('span', 'ytaf-ui-version', `v${__YTAF_VERSION__}`));
  elmContainer.appendChild(elmHeader);

  /* Sidebar, content, help column */
  const elmNav = el('div', 'ytaf-ui-nav');
  const elmBody = el('div', 'ytaf-ui-body');
  const elmSide = el('div', 'ytaf-ui-side');
  elmContainer.appendChild(elmNav);
  elmContainer.appendChild(elmBody);
  elmContainer.appendChild(elmSide);

  const elmHelpTitle = el('div', 'ytaf-ui-help-title');
  const elmHelp = el('div', 'ytaf-ui-help');
  const elmHint = el('div', 'ytaf-ui-hint');
  const elmKeys = el('div', 'ytaf-ui-keys');
  elmSide.appendChild(elmHelpTitle);
  elmSide.appendChild(elmHelp);
  elmSide.appendChild(elmHint);
  elmSide.appendChild(elmKeys);

  const pages = PAGES.map((page) => {
    const elmPage = buildPage(page);
    elmPage.style.display = 'none';
    elmBody.appendChild(elmPage);
    return elmPage;
  });

  /** @type {(HTMLElement | null)[]} */
  const lastInPage = PAGES.map(() => null);

  const navItems = PAGES.map((page, index) => {
    const elmItem = el('button', 'ytaf-ui-nav-item');
    elmItem.appendChild(createIcon(page.title));
    elmItem.appendChild(
      el('span', 'ytaf-ui-nav-label', t(`ui.${page.title}`, page.title))
    );
    const elmDot = el('span', 'ytaf-ui-nav-dot');
    elmItem.appendChild(elmDot);
    elmItem.ytafDot = elmDot;
    elmItem.addEventListener('click', () => enterPage());
    // Moving along the sidebar switches pages right away.
    elmItem.addEventListener('focus', () => showPage(index));
    elmNav.appendChild(elmItem);
    return elmItem;
  });

  const updateDots = () => {
    PAGES.forEach((page, index) => {
      const hasNew = pageKeys(page).some(isNewOption);
      navItems[index].ytafDot.style.display = hasNew ? '' : 'none';
    });
  };

  function showPage(index) {
    if (index !== currentPage) elmBody.scrollTop = 0;
    currentPage = index;
    pages.forEach((elmPage, i) => {
      elmPage.style.display = i === index ? 'block' : 'none';
    });
    navItems.forEach((elmItem, i) => {
      elmItem.classList.toggle('ytaf-ui-nav-active', i === index);
    });
  }

  /** Focusable controls of the current page, top to bottom. */
  const pageControls = () => {
    const found = pages[currentPage].querySelectorAll('button, input');
    const list = [];
    for (let i = 0; i < found.length; i++) {
      if (found[i].offsetParent !== null) list.push(found[i]);
    }
    return list;
  };

  function enterPage() {
    const remembered = lastInPage[currentPage];
    const controls = pageControls();
    const target =
      remembered && controls.indexOf(remembered) !== -1
        ? remembered
        : controls[0];
    target?.focus();
  }

  const refresh = () => {
    for (const elmPage of pages) {
      const sections = elmPage.querySelectorAll('div');
      for (let i = 0; i < sections.length; i++) {
        sections[i].dispatchEvent(new CustomEvent('ytaf-refresh'));
      }
      elmPage.dispatchEvent(new CustomEvent('ytaf-refresh'));
    }
    elmKeys.textContent = keyLegendProvider?.() ?? '';
    updateDots();
  };

  /** Fill the help column for the focused element. */
  const describe = (target) => {
    const navIndex = navItems.indexOf(target);
    if (navIndex !== -1) {
      const page = PAGES[navIndex];
      elmHelpTitle.textContent = t(`ui.${page.title}`, page.title);
      elmHelp.textContent = t(`ui.pageHelp.${page.title}`, page.help);
      elmHint.textContent = t('ui.hintNav', 'OK or › opens this page');
      return;
    }

    const elmHelpHolder = withAttribute(target, 'data-help');
    const elmKeyHolder = withAttribute(target, 'data-config-key');
    const key = elmKeyHolder?.getAttribute('data-config-key') ?? null;
    const label =
      target instanceof HTMLElement
        ? (target.querySelector('.ytaf-ui-row-label')?.firstChild
            ?.textContent ?? '')
        : '';
    elmHelpTitle.textContent = label || (key ? optionLabel(key) : '');
    elmHelp.textContent = elmHelpHolder
      ? elmHelpHolder.getAttribute('data-help')
      : key
        ? optionHelp(key)
        : '';

    if (target && target.ytafStep) {
      elmHint.textContent = t(
        'ui.hintChoice',
        '‹ › change the value, OK next value'
      );
    } else if (
      target instanceof HTMLElement &&
      target.classList.contains('ytaf-ui-row-toggle')
    ) {
      elmHint.textContent = t('ui.hintToggle', 'OK switches on or off');
    } else {
      elmHint.textContent = '';
    }
  };

  let pointerFocus = false;
  let visible = false;
  let lastFocused = null;
  let lastKeyDown = null;

  elmContainer.addEventListener(
    'focus',
    (evt) => {
      const target = evt.target;
      lastFocused = target;
      if (!pointerFocus) scrollIntoContainer(elmBody, target);
      describe(target);
      if (pages[currentPage].contains(target)) {
        lastInPage[currentPage] = target;
      }
      const key = withAttribute(target, 'data-config-key')?.getAttribute(
        'data-config-key'
      );
      if (key && isNewOption(key)) {
        markSeen(key);
        updateDots();
      }
    },
    true
  );

  // Magic Remote: the row under the pointer gets the focus.
  elmContainer.addEventListener('mouseover', (evt) => {
    const target = focusableOf(evt.target);
    if (!target || target === document.activeElement) return;
    pointerFocus = true;
    target.focus();
    pointerFocus = false;
  });

  const onKeyDown = (evt) => {
    const active = document.activeElement;
    const typing = active instanceof HTMLInputElement && active.type === 'text';
    const navIndex = navItems.indexOf(active);
    const code = evt.keyCode;

    if (code === KEY_BACK || code === KEY_BACK_WEBOS) {
      hide();
    } else if (
      code === KEY_LEFT ||
      code === KEY_UP ||
      code === KEY_RIGHT ||
      code === KEY_DOWN
    ) {
      const horizontal = code === KEY_LEFT || code === KEY_RIGHT;
      // Let the cursor move inside a text field; left at its start leaves it.
      const atStart =
        typing && active.selectionStart === 0 && active.selectionEnd === 0;
      if (typing && horizontal && !(code === KEY_LEFT && atStart)) return;

      if (navIndex !== -1) {
        if (code === KEY_UP && navIndex > 0) navItems[navIndex - 1].focus();
        if (code === KEY_DOWN && navIndex < navItems.length - 1) {
          navItems[navIndex + 1].focus();
        }
        if (code === KEY_RIGHT) enterPage();
      } else if (horizontal) {
        if (active && active.ytafStep) {
          active.ytafStep(code === KEY_RIGHT ? 1 : -1);
        } else if (code === KEY_LEFT) {
          navItems[currentPage].focus();
        }
      } else {
        const controls = pageControls();
        const index = controls.indexOf(active);
        const next = controls[index + (code === KEY_DOWN ? 1 : -1)];
        if (next) next.focus();
        else if (index === -1) enterPage();
        else if (code === KEY_UP) elmBody.scrollTop = 0;
      }
    } else if (code === KEY_ENTER) {
      /**
       * The YouTube app generates these "OK" events from clicks (including
       * with the Magic Remote), and we don't want to send a duplicate click
       * event for those. Youtube uses the `Event` class instead of
       * `KeyboardEvent` so we check for that.
       * See issue #143 and #200 for context.
       */
      if (typing) {
        // Handled by the field itself (adds the entry).
        evt.stopPropagation();
        return;
      }
      if (evt instanceof KeyboardEvent) active?.click();
    } else if (typing) {
      // Regular typing: keep it away from YouTube but let the field have it.
      evt.stopPropagation();
      return;
    } else {
      // Green and other color buttons are handled globally.
      return;
    }

    evt.preventDefault();
    evt.stopPropagation();
  };

  /** Pull focus back if YouTube moved it while the panel is open. */
  const reclaimFocus = () => {
    if (elmContainer.contains(document.activeElement)) return;
    const target =
      lastFocused && elmContainer.contains(lastFocused)
        ? lastFocused
        : navItems[currentPage];
    target.focus();
  };

  // Listen on window in the capture phase so keys reach the panel before
  // YouTube, even when YouTube took the focus (e.g. on the account screen).
  const isColorKey = (evt) => evt.keyCode >= 403 && evt.keyCode <= 406;
  const isTextField = (elm) =>
    elm instanceof HTMLInputElement && elm.type === 'text';
  const onWindowKeyDown = (evt) => {
    if (!visible || isColorKey(evt)) return;
    // Never trap the remote behind a panel that is not on screen.
    if (!elmContainer.offsetWidth || !elmContainer.offsetHeight) {
      logger.warn('panel has no size on screen, closing it');
      hide();
      return;
    }
    lastKeyDown = evt.keyCode;
    reclaimFocus();
    onKeyDown(evt);
    // Never let YouTube navigate in the background. Text fields get
    // their keys themselves (onKeyDown stops them there).
    if (!isTextField(document.activeElement)) evt.stopPropagation();
  };
  const onWindowKeyOther = (evt) => {
    if (isColorKey(evt)) return;
    // Also the release of Back that just closed the panel.
    if (visible || evt.keyCode === lastKeyDown) evt.stopPropagation();
    if (evt.type === 'keyup' && evt.keyCode === lastKeyDown) {
      lastKeyDown = null;
    }
  };
  const onFocusIn = (evt) => {
    if (visible && !elmContainer.contains(evt.target)) {
      setTimeout(reclaimFocus, 0);
    }
  };
  window.addEventListener('keydown', onWindowKeyDown, true);
  window.addEventListener('keypress', onWindowKeyOther, true);
  window.addEventListener('keyup', onWindowKeyOther, true);
  document.addEventListener('focusin', onFocusIn, true);

  /**
   * Size the panel to the visible screen in pixels. CSS sizes depend on how
   * YouTube sizes and scales the page, which differs between TVs (the panel
   * ended up taller than the screen), so measure and correct instead.
   */
  function fitToScreen() {
    const { screenW, screenH } = screenSize();
    const box = {
      left: screenW * 0.03,
      top: screenH * 0.04,
      width: screenW * 0.94,
      height: screenH * 0.92
    };
    const style = elmContainer.style;
    let scale = 1;
    let left = box.left;
    let top = box.top;
    const apply = () => {
      style.left = `${Math.round(left)}px`;
      style.top = `${Math.round(top)}px`;
      style.width = `${Math.round(box.width / scale)}px`;
      style.height = `${Math.round(box.height / scale)}px`;
      style.fontSize = `${Math.max(12, Math.round((screenH * 0.024) / scale))}px`;
    };
    style.position = 'fixed';
    style.right = 'auto';
    style.bottom = 'auto';
    apply();

    // A zoomed or transformed ancestor moves or scales "fixed" boxes.
    // Measure and correct until the box lands where it should.
    for (let i = 0; i < 3; i++) {
      const rect = elmContainer.getBoundingClientRect();
      const off =
        Math.abs(rect.width - box.width) > 1 ||
        Math.abs(rect.height - box.height) > 1 ||
        Math.abs(rect.left - box.left) > 1 ||
        Math.abs(rect.top - box.top) > 1;
      if (!off || rect.width <= 0 || rect.height <= 0) break;
      const factor = Math.max(
        rect.width / (box.width / scale),
        rect.height / (box.height / scale)
      );
      left += (box.left - rect.left) / factor;
      top += (box.top - rect.top) / factor;
      scale = factor;
      apply();
    }
    lastFit = { scale, left: Math.round(left), top: Math.round(top) };
  }

  /** @type {{ scale: number, left: number, top: number } | null} */
  let lastFit = null;

  /** The smallest of the sizes the browser reports, so nothing overflows. */
  function screenSize() {
    const root = document.documentElement;
    const widths = [window.innerWidth, root.clientWidth].filter((n) => n > 0);
    const heights = [window.innerHeight, root.clientHeight].filter(
      (n) => n > 0
    );
    return {
      screenW: widths.length ? Math.min.apply(null, widths) : 1920,
      screenH: heights.length ? Math.min.apply(null, heights) : 1080
    };
  }

  addDiagnosticsLines(() => {
    const root = document.documentElement;
    const rect = elmContainer.getBoundingClientRect();
    const round = (n) => Math.round(n);
    return [
      `Screen: window ${window.innerWidth}x${window.innerHeight}, ` +
        `document ${root.clientWidth}x${root.clientHeight}, ` +
        `display ${screen.width}x${screen.height}, ` +
        `ratio ${window.devicePixelRatio || 1}, ` +
        `zoom ${getComputedStyle(root).zoom || '-'}/${getComputedStyle(document.body).zoom || '-'}`,
      `Panel: ${round(rect.left)},${round(rect.top)} ${round(rect.width)}x${round(rect.height)}` +
        (lastFit ? `, scale ${lastFit.scale.toFixed(3)}` : '')
    ];
  });

  window.addEventListener('resize', () => {
    if (visible) fitToScreen();
  });

  function show() {
    if (visible) return;
    visible = true;
    elmContainer.style.display = 'block';
    try {
      fitToScreen();
    } catch (err) {
      logger.error('could not size the panel:', err);
    }
    // A failing section must not leave an empty panel that swallows keys.
    try {
      refresh();
    } catch (err) {
      logger.error('refresh failed:', err);
    }
    try {
      showPage(currentPage);
      navItems[currentPage].focus();
    } catch (err) {
      logger.error('could not open the panel:', err);
      hide();
    }
  }

  function hide() {
    if (!visible) return;
    visible = false;
    elmContainer.style.display = 'none';
    elmContainer.blur();
    document.activeElement?.blur?.();
  }

  function destroy() {
    hide();
    window.removeEventListener('keydown', onWindowKeyDown, true);
    window.removeEventListener('keypress', onWindowKeyOther, true);
    window.removeEventListener('keyup', onWindowKeyOther, true);
    document.removeEventListener('focusin', onFocusIn, true);
    if (elmContainer.parentNode) {
      elmContainer.parentNode.removeChild(elmContainer);
    }
  }

  return {
    element: elmContainer,
    show,
    hide,
    destroy,
    isVisible: () => visible
  };
}

let panel = createOptionsPanel();
document.body.appendChild(panel.element);

// Rebuild with the new language right away.
configAddChangeListener('language', () => {
  const wasVisible = panel.isVisible();
  panel.destroy();
  panel = createOptionsPanel();
  document.body.appendChild(panel.element);
  if (wasVisible) {
    panel.show();
    panel.element.querySelector('[data-config-key="language"]')?.focus();
  }
});

/**
 * Show or hide the options panel.
 * @param {boolean} [visible=true]
 */
export function showOptionsPanel(visible = true) {
  if (visible) panel.show();
  else panel.hide();
}

export function isOptionsPanelVisible() {
  return panel.isVisible();
}

const CONFIG_KEY = 'ytaf-configuration';

// Category options used to be booleans (true = skip). Keep stored values working.
const migrateSponsorBlockMode = (value) =>
  value === true ? 'skip' : value === false ? 'show' : value;

const SPONSORBLOCK_MODES = [
  { value: 'skip', label: 'Skip' },
  { value: 'manual', label: 'Ask' },
  { value: 'show', label: 'Show only' },
  { value: 'off', label: 'Off' }
];

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => ({
  value,
  label: `${value}x`
}));

/**
 * Option shapes:
 * - boolean options: `{ default: boolean, desc }`
 * - choice options: `{ default, desc, choices: { value, label }[] }`
 * - data options (not shown as a control): `{ default, desc }`
 */
const configOptions = new Map([
  ['enableAdBlock', { default: true, desc: 'Enable ad blocking' }],
  ['upgradeThumbnails', { default: false, desc: 'Upgrade thumbnail quality' }],
  ['removeShorts', { default: false, desc: 'Remove Shorts everywhere' }],
  [
    'hideWatchedVideos',
    { default: false, desc: 'Hide watched videos in feeds' }
  ],
  [
    'blockedChannels',
    { default: [], desc: 'Channels hidden from feeds and search' }
  ],
  [
    'enableDeArrow',
    { default: false, desc: 'DeArrow: replace clickbait titles' }
  ],
  [
    'enableDeArrowThumbnails',
    { default: false, desc: 'DeArrow: replace clickbait thumbnails' }
  ],
  ['enableSponsorBlock', { default: true, desc: 'Enable SponsorBlock' }],
  [
    'enableSponsorBlockSponsor',
    {
      default: 'skip',
      desc: 'Sponsor',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockIntro',
    {
      default: 'skip',
      desc: 'Intro',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockOutro',
    {
      default: 'skip',
      desc: 'Outro',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockInteraction',
    {
      default: 'skip',
      desc: 'Interaction reminder',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockSelfPromo',
    {
      default: 'skip',
      desc: 'Self promotion',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockMusicOfftopic',
    {
      default: 'skip',
      desc: 'Non-music part in music videos',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockPreview',
    {
      default: 'show',
      desc: 'Recap and preview',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockFiller',
    {
      default: 'show',
      desc: 'Filler tangent',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockHighlight',
    { default: true, desc: 'Offer jump to highlight ([YELLOW])' }
  ],
  [
    'enableSponsorBlockNotifications',
    { default: true, desc: 'Show skip notifications' }
  ],
  [
    'defaultPlaybackSpeed',
    {
      default: 1,
      desc: 'Default playback speed ([RED] cycles)',
      choices: PLAYBACK_SPEEDS
    }
  ],
  [
    'hideYouThere',
    { default: true, desc: 'Never ask "Are you still watching?"' }
  ],
  [
    'forceOriginalAudio',
    { default: false, desc: 'Prefer original audio over dubbed tracks' }
  ],
  [
    'disableAutoCaptions',
    { default: false, desc: 'Do not turn on subtitles automatically' }
  ],
  ['enableReturnDislike', { default: false, desc: 'Show dislike count' }],
  ['hideLogo', { default: false, desc: 'Hide YouTube logo' }],
  ['showWatch', { default: false, desc: 'Display time in UI' }],
  [
    'showWatchAlways',
    { default: false, desc: 'Keep clock visible during playback' }
  ],
  ['oledTheme', { default: false, desc: 'Pure black (OLED) background' }],
  ['disableAnimations', { default: false, desc: 'Disable UI animations' }],
  [
    'forceHighResVideo',
    { default: false, desc: 'Force max resolution video playback' }
  ],
  [
    'forceVp9Codec',
    { default: false, desc: 'Prefer VP9 over AV1 video codec' }
  ],
  [
    'removeEndscreen',
    { default: false, desc: 'Remove end screens from video' }
  ],
  [
    'mutePreviews',
    { default: false, desc: 'Mute video previews while browsing' }
  ],
  [
    'enableLiveCatchup',
    { default: false, desc: 'Reduce live stream delay (skip to live edge)' }
  ],
  [
    'autoAccountSelect',
    { default: false, desc: 'Bypass initial account selection on startup' }
  ]
]);

const defaultConfig = (() => {
  let ret = {};
  for (const [k, v] of configOptions) {
    ret[k] = v.default;
  }
  return ret;
})();

/** @type {Record<string, DocumentFragment>} as const */
const configFrags = (() => {
  let ret = {};
  for (const k of configOptions.keys()) {
    ret[k] = new DocumentFragment();
  }
  return ret;
})();

function loadStoredConfig() {
  const storage = window.localStorage.getItem(CONFIG_KEY);

  if (storage === null) {
    console.info('Config not set; using defaults.');
    return null;
  }

  try {
    return JSON.parse(storage);
  } catch (err) {
    console.warn('Error parsing stored config:', err);
    return null;
  }
}

// Use defaultConfig as a prototype so writes to localConfig don't change it.
let localConfig = loadStoredConfig() ?? Object.create(defaultConfig);

function configExists(key) {
  return configOptions.has(key);
}

/**
 * Returns the list of choices for a choice option, or `null` otherwise.
 * @param {string} key
 * @returns {{ value: unknown, label: string }[] | null}
 */
export function configGetChoices(key) {
  if (!configExists(key)) {
    throw new Error('tried to get choices for unknown config key: ' + key);
  }

  return configOptions.get(key).choices ?? null;
}

export function configGetDesc(key) {
  if (!configExists(key)) {
    throw new Error('tried to get desc for unknown config key: ' + key);
  }

  return configOptions.get(key).desc;
}

export function configRead(key) {
  if (!configExists(key)) {
    throw new Error('tried to read unknown config key: ' + key);
  }

  if (localConfig[key] === undefined) {
    console.warn(
      'Populating key',
      key,
      'with default value',
      defaultConfig[key]
    );

    localConfig[key] = defaultConfig[key];
  }

  const option = configOptions.get(key);
  const value = localConfig[key];

  if (option.choices && !option.choices.some((c) => c.value === value)) {
    const migrated = option.migrate?.(value);
    return option.choices.some((c) => c.value === migrated)
      ? migrated
      : option.default;
  }

  return value;
}

export function configWrite(key, value) {
  if (!configExists(key)) {
    throw new Error('tried to write unknown config key: ' + key);
  }

  const oldValue =
    localConfig[key] !== undefined ? localConfig[key] : defaultConfig[key];

  console.info('Changing key', key, 'from', oldValue, 'to', value);
  localConfig[key] = value;
  window.localStorage[CONFIG_KEY] = JSON.stringify(localConfig);

  configFrags[key].dispatchEvent(
    new CustomEvent('ytafConfigChange', {
      detail: { key, newValue: value, oldValue }
    })
  );
}

/**
 * Add a listener for changes in the value of a specified config option
 * @param {string} key Config option to monitor
 * @param {(evt: Event) => void} callback Function to be called on change
 */
export function configAddChangeListener(key, callback) {
  const frag = configFrags[key];

  frag.addEventListener('ytafConfigChange', callback);
}

/**
 * Remove a listener for changes in the value of a specified config option
 * @param {string} key Config option to monitor
 * @param {(evt: Event) => void} callback Function to be called on change
 */
export function configRemoveChangeListener(key, callback) {
  const frag = configFrags[key];

  frag.removeEventListener('ytafConfigChange', callback);
}

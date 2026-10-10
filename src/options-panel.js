/*global navigate, __YTAF_VERSION__*/
/**
 * The settings panel opened with the green button.
 *
 * It is split into pages with a tab row on top. Every control carries a
 * `data-config-key` so the footer can show the matching help text.
 */
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
import { t } from './i18n';
import { clearLogEntries, getLogEntries } from './logger';

const ARROW_KEY_CODE = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };
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

/* ----------------------------- Controls ----------------------------- */

/** @param {string} key */
function createConfigCheckbox(key) {
  const elmInput = document.createElement('input');
  elmInput.type = 'checkbox';
  elmInput.checked = configRead(key);

  elmInput.addEventListener('change', (evt) => {
    configWrite(key, evt.target.checked);
  });

  configAddChangeListener(key, (evt) => {
    elmInput.checked = evt.detail.newValue;
  });

  const elmLabel = document.createElement('label');
  elmLabel.setAttribute('data-config-key', key);
  elmLabel.appendChild(elmInput);
  // Use non-breaking space (U+00A0)
  elmLabel.appendChild(document.createTextNode(' ' + optionLabel(key)));

  return elmLabel;
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
    elmButton.textContent = `${optionLabel(key)}: ${choiceLabel(choice.label)}`;
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
 * @param {string} text
 * @param {() => void} onClick
 * @param {string} [key] Config key for the help line
 */
function createButton(text, onClick, key) {
  const elmButton = document.createElement('button');
  elmButton.className = 'ytaf-ui-choice';
  elmButton.textContent = text;
  if (key) elmButton.setAttribute('data-config-key', key);
  elmButton.addEventListener('click', onClick);
  return elmButton;
}

/** @param {string} text */
function createHeading(text) {
  const elmTitle = document.createElement('h2');
  elmTitle.textContent = text;
  return elmTitle;
}

/**
 * Editor for a config option holding a list of strings: a text field to add
 * entries and one button per entry to remove it.
 * @param {string} key
 */
function createListEditor(key) {
  const elmSection = document.createElement('div');
  elmSection.appendChild(createHeading(optionLabel(key)));

  const elmInput = document.createElement('input');
  elmInput.type = 'text';
  elmInput.className = 'ytaf-ui-text';
  elmInput.placeholder = t('ui.inputHint', 'Type a word, then OK');
  elmInput.setAttribute('data-config-key', key);
  elmSection.appendChild(elmInput);

  const elmList = document.createElement('div');
  elmSection.appendChild(elmList);

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

  const render = () => {
    elmList.textContent = '';
    const list = configRead(key);
    if (!list.length) {
      const elmEmpty = document.createElement('small');
      elmEmpty.textContent = t('ui.listEmpty', 'No entries yet.');
      elmList.appendChild(elmEmpty);
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
  const elmSection = document.createElement('div');
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
      const elmEmpty = document.createElement('small');
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

/* ----------------------------- Diagnostics ----------------------------- */

function formatTime(date) {
  const pad = (n) => (n < 10 ? '0' : '') + n;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function createDiagnosticsSection() {
  const elmSection = document.createElement('div');

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

  elmSection.addEventListener('ytaf-refresh', render);
  render();

  return elmSection;
}

/* -------------------------------- Pages -------------------------------- */

/** @param {string[]} keys */
function createKeyList(keys) {
  const elmPage = document.createElement('div');
  for (const key of keys) elmPage.appendChild(createConfigControl(key));
  return elmPage;
}

const PAGES = [
  {
    title: 'General',
    build: () =>
      createKeyList([
        'language',
        'enableAdBlock',
        'autoAccountSelect',
        'startPage',
        'hideYouThere',
        'hideNags',
        'mutePreviews'
      ])
  },
  {
    title: 'Playback',
    build: () =>
      createKeyList([
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
  },
  {
    title: 'Feeds',
    build: () =>
      createKeyList([
        'removeShorts',
        'hideWatchedVideos',
        'hideLiveStreams',
        'hideUpcoming',
        'hideMembersOnly',
        'minVideoLength',
        'hideWatchRecommendations',
        'upgradeThumbnails',
        'enableDeArrow',
        'enableDeArrowThumbnails'
      ])
  },
  {
    title: 'Blocking',
    build: () => {
      const elmPage = document.createElement('div');
      elmPage.appendChild(createBlockedChannelsSection());
      elmPage.appendChild(createListEditor('blockedKeywords'));
      elmPage.appendChild(createListEditor('hiddenShelves'));
      return elmPage;
    }
  },
  {
    title: 'Appearance',
    build: () =>
      createKeyList([
        'hideLogo',
        'showWatch',
        'showWatchAlways',
        'clockFormat',
        'clockShowDate',
        'notificationPosition',
        'notificationDuration',
        'oledTheme',
        'disableAnimations'
      ])
  },
  {
    title: 'Buttons',
    build: () => createKeyList(['redButton', 'yellowButton', 'blueButton'])
  },
  {
    title: 'SponsorBlock',
    build: () => {
      const elmPage = createKeyList([
        'enableSponsorBlock',
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
      ]);
      const elmLink = document.createElement('small');
      elmLink.className = 'ytaf-ui-sponsor';
      elmLink.textContent = 'https://sponsor.ajay.app';
      elmPage.appendChild(elmLink);
      return elmPage;
    }
  },
  { title: 'Diagnostics', build: createDiagnosticsSection }
];

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

  if (elmRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - elmRect.top;
  } else if (elmRect.bottom > containerRect.bottom) {
    container.scrollTop += elmRect.bottom - containerRect.bottom;
  }
}

/**
 * @param {EventTarget | null} target
 * @returns {string | null}
 */
function configKeyOf(target) {
  // Element.closest() is missing on webOS 3, so walk up manually.
  let node = target instanceof HTMLElement ? target : null;
  while (node && !node.hasAttribute('data-config-key')) {
    node = node.parentElement;
  }
  return node?.getAttribute('data-config-key') ?? null;
}

/** @type {(() => string) | null} */
let keyLegendProvider = null;

/**
 * Register the function that describes the color button layout for the
 * footer.
 * @param {() => string} provider
 */
export function setKeyLegendProvider(provider) {
  keyLegendProvider = provider;
}

let currentPage = 0;

function createOptionsPanel() {
  const elmContainer = document.createElement('div');
  elmContainer.classList.add('ytaf-ui-container');
  elmContainer.style.display = 'none';
  elmContainer.setAttribute('tabindex', 0);

  const elmHeading = document.createElement('h1');
  elmHeading.textContent = 'webOS YouTube Extended';
  elmContainer.appendChild(elmHeading);

  const elmTabs = document.createElement('div');
  elmTabs.className = 'ytaf-ui-tabs';
  elmContainer.appendChild(elmTabs);

  const elmBody = document.createElement('div');
  elmBody.className = 'ytaf-ui-body';
  elmContainer.appendChild(elmBody);

  const elmFooter = document.createElement('div');
  elmFooter.className = 'ytaf-ui-footer';
  elmContainer.appendChild(elmFooter);

  const elmHelp = document.createElement('div');
  elmHelp.className = 'ytaf-ui-help';
  elmFooter.appendChild(elmHelp);

  const elmKeys = document.createElement('div');
  elmKeys.className = 'ytaf-ui-keys';
  elmFooter.appendChild(elmKeys);

  const elmVersion = document.createElement('div');
  elmVersion.className = 'ytaf-ui-version';
  elmVersion.textContent = `v${__YTAF_VERSION__}`;
  elmFooter.appendChild(elmVersion);

  const pages = PAGES.map((page) => {
    const elmPage = page.build();
    elmPage.style.display = 'none';
    elmBody.appendChild(elmPage);
    return elmPage;
  });

  const tabs = PAGES.map((page, index) => {
    const elmTab = document.createElement('button');
    elmTab.className = 'ytaf-ui-tab';
    elmTab.textContent = t(`ui.${page.title}`, page.title);
    elmTab.addEventListener('click', () => showPage(index));
    // Moving the focus along the tab row switches pages right away.
    elmTab.addEventListener('focus', () => showPage(index));
    elmTabs.appendChild(elmTab);
    return elmTab;
  });

  function showPage(index) {
    currentPage = index;
    pages.forEach((elmPage, i) => {
      elmPage.style.display = i === index ? 'block' : 'none';
    });
    tabs.forEach((elmTab, i) => {
      elmTab.classList.toggle('ytaf-ui-tab-active', i === index);
    });
    elmBody.scrollTop = 0;
  }

  const refresh = () => {
    for (const elmPage of pages) {
      for (const elm of elmPage.querySelectorAll('div')) {
        elm.dispatchEvent(new CustomEvent('ytaf-refresh'));
      }
      elmPage.dispatchEvent(new CustomEvent('ytaf-refresh'));
    }
    elmKeys.textContent = keyLegendProvider?.() ?? '';
  };

  elmContainer.addEventListener(
    'focus',
    (evt) => {
      scrollIntoContainer(elmBody, evt.target);
      const key = configKeyOf(evt.target);
      elmHelp.textContent = key ? optionHelp(key) : '';
    },
    true
  );

  elmContainer.addEventListener(
    'keydown',
    (evt) => {
      const active = document.activeElement;
      const typing =
        active instanceof HTMLInputElement && active.type === 'text';

      if (evt.keyCode === KEY_BACK || evt.keyCode === KEY_BACK_WEBOS) {
        hide();
      } else if (evt.keyCode in ARROW_KEY_CODE) {
        // Let the cursor move inside a text field.
        const horizontal = evt.keyCode === 37 || evt.keyCode === 39;
        if (typing && horizontal) return;

        // Keep vertical movement between the tab row and the page predictable:
        // down from a tab enters the page at its top, up from the first
        // control returns to the active tab.
        const focusables = pages[currentPage].querySelectorAll('input, button');
        let first = null;
        for (let i = 0; i < focusables.length && !first; i++) {
          if (focusables[i].offsetParent !== null) first = focusables[i];
        }
        if (evt.keyCode === 40 && tabs.includes(active) && first) {
          first.focus();
        } else if (evt.keyCode === 38 && active === first) {
          tabs[currentPage].focus();
        } else {
          navigate(ARROW_KEY_CODE[evt.keyCode]);
        }
      } else if (evt.keyCode === KEY_ENTER) {
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
    },
    true
  );

  let visible = false;

  function show() {
    if (visible) return;
    visible = true;
    refresh();
    elmContainer.style.display = 'block';
    showPage(currentPage);
    tabs[currentPage].focus();
  }

  function hide() {
    if (!visible) return;
    visible = false;
    elmContainer.style.display = 'none';
    elmContainer.blur();
    document.activeElement?.blur?.();
  }

  return {
    element: elmContainer,
    show,
    hide,
    isVisible: () => visible
  };
}

let panel = createOptionsPanel();
document.body.appendChild(panel.element);

// Rebuild with the new language right away.
configAddChangeListener('language', () => {
  const wasVisible = panel.isVisible();
  panel.hide();
  panel.element.remove();
  panel = createOptionsPanel();
  document.body.appendChild(panel.element);
  if (wasVisible) panel.show();
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

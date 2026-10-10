import sha256 from 'tiny-sha256';
import { configRead } from './config';
import { getButtonLabel, setColorActionHandler, showNotification } from './ui';
import { t } from './i18n';
import { createLogger } from './logger';

const logger = createLogger('sponsorblock');

// Copied from https://github.com/ajayyy/SponsorBlock/blob/9392d16617d2d48abb6125c00e2ff6042cb7bebe/src/config.ts#L179-L233
const barTypes = {
  sponsor: {
    color: '#00d400',
    opacity: '0.7',
    name: 'sponsored segment'
  },
  intro: {
    color: '#00ffff',
    opacity: '0.7',
    name: 'intro'
  },
  outro: {
    color: '#0202ed',
    opacity: '0.7',
    name: 'outro'
  },
  interaction: {
    color: '#cc00ff',
    opacity: '0.7',
    name: 'interaction reminder'
  },
  selfpromo: {
    color: '#ffff00',
    opacity: '0.7',
    name: 'self-promotion'
  },
  music_offtopic: {
    color: '#ff9900',
    opacity: '0.7',
    name: 'non-music part'
  },
  preview: {
    color: '#008fd6',
    opacity: '0.7',
    name: 'recap or preview'
  },
  filler: {
    color: '#7300ff',
    opacity: '0.9',
    name: 'filler tangent'
  }
};

// Maps SponsorBlock categories to the config keys that enable skipping them.
const categoryConfigKeys = {
  sponsor: 'enableSponsorBlockSponsor',
  intro: 'enableSponsorBlockIntro',
  outro: 'enableSponsorBlockOutro',
  interaction: 'enableSponsorBlockInteraction',
  selfpromo: 'enableSponsorBlockSelfPromo',
  music_offtopic: 'enableSponsorBlockMusicOfftopic',
  preview: 'enableSponsorBlockPreview',
  filler: 'enableSponsorBlockFiller'
};

/**
 * Per-category mode: 'skip' (automatic), 'manual' (offer skip on a button),
 * 'show' (only mark on the progress bar) or 'off'.
 */
function getCategoryMode(category) {
  const key = categoryConfigKeys[category];
  return key ? configRead(key) : 'off';
}

function segmentName(category) {
  return t(`segment.${category}`, barTypes[category]?.name || category);
}

function buttonLabel() {
  return getButtonLabel('sponsorblock') ?? '';
}

function notify(text, time = 2000) {
  if (configRead('enableSponsorBlockNotifications')) {
    showNotification(text, time, 'indigo');
  }
}

const sponsorblockAPI = 'https://sponsorblock.inf.re/api';

class SponsorBlockHandler {
  video = null;
  active = true;

  attachVideoTimeout = null;
  nextSkipTimeout = null;

  slider = null;
  sliderInterval = null;
  sliderObserver = null;
  sliderSegmentsOverlay = null;

  scheduleSkipHandler = null;
  durationChangeHandler = null;
  segments = null;
  highlight = null;
  notifiedSegments = new Set();
  skippedSegments = new Set();

  constructor(videoID) {
    this.videoID = videoID;
  }

  async init() {
    const videoHash = sha256(this.videoID).substring(0, 4);
    const categories = [...Object.keys(categoryConfigKeys), 'poi_highlight'];

    let results;
    try {
      const resp = await fetch(
        `${sponsorblockAPI}/skipSegments/${videoHash}?categories=${encodeURIComponent(
          JSON.stringify(categories)
        )}`
      );

      // The API answers 404 when no segments exist for the hash prefix.
      if (resp.status === 404) {
        console.debug(this.videoID, 'No segments found.');
        return;
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      results = await resp.json();
    } catch (err) {
      logger.warn(this.videoID, 'failed to fetch segments:', err);
      return;
    }

    // The handler may have been destroyed while the request was in flight.
    if (!this.active) return;

    const result = Array.isArray(results)
      ? results.find((v) => v.videoID === this.videoID)
      : null;
    console.debug(this.videoID, 'Got it:', result);

    const allSegments = result?.segments ?? [];

    // Only `skip` segments are relevant here. `full` marks the whole video
    // (e.g. a sponsored video) and must never trigger a seek.
    const segments = allSegments.filter(
      (seg) =>
        (seg.actionType ?? 'skip') === 'skip' &&
        getCategoryMode(seg.category) !== 'off'
    );

    this.highlight = configRead('enableSponsorBlockHighlight')
      ? (allSegments.find((seg) => seg.category === 'poi_highlight') ?? null)
      : null;

    if (!segments.length && !this.highlight) {
      console.debug(this.videoID, 'No segments found.');
      return;
    }

    this.segments = segments;

    if (this.highlight && getButtonLabel('sponsorblock')) {
      notify(
        t(
          'msg.highlightAvailable',
          'Highlight available - press {button} to jump to it',
          { button: buttonLabel() }
        ),
        4000
      );
    }

    this.scheduleSkipHandler = () => this.scheduleSkip();
    this.durationChangeHandler = () => this.buildOverlay();

    this.attachVideo();
    this.buildOverlay();
  }

  /**
   * Handle a press of the SponsorBlock button. Skips the current "Ask" segment or
   * jumps to the highlight.
   * @returns {boolean} Whether the press was used.
   */
  handleButton() {
    if (!this.video) return false;
    const time = this.video.currentTime;

    const current = this.segments.find(
      (seg) =>
        getCategoryMode(seg.category) === 'manual' &&
        seg.segment[0] - 0.5 <= time &&
        time < seg.segment[1]
    );
    if (current) {
      notify(
        t('msg.skipping', 'Skipping {name}', {
          name: segmentName(current.category)
        })
      );
      this.video.currentTime = current.segment[1];
      return true;
    }

    if (this.highlight && time < this.highlight.segment[0] - 1) {
      notify(t('msg.jumpHighlight', 'Jumping to highlight'));
      this.video.currentTime = this.highlight.segment[0];
      return true;
    }

    return false;
  }

  attachVideo() {
    clearTimeout(this.attachVideoTimeout);
    this.attachVideoTimeout = null;

    this.video = document.querySelector('video');
    if (!this.video) {
      console.debug(this.videoID, 'No video yet...');
      this.attachVideoTimeout = setTimeout(() => this.attachVideo(), 100);
      return;
    }

    console.debug(this.videoID, 'Video found, binding...');

    this.video.addEventListener('play', this.scheduleSkipHandler);
    this.video.addEventListener('pause', this.scheduleSkipHandler);
    this.video.addEventListener('timeupdate', this.scheduleSkipHandler);
    this.video.addEventListener('durationchange', this.durationChangeHandler);
  }

  buildOverlay() {
    if (this.sliderSegmentsOverlay) {
      console.debug('Overlay already built');
      return;
    }

    if (!this.video || !this.video.duration) {
      console.debug('No video duration yet');
      return;
    }

    const videoDuration = this.video.duration;

    this.sliderSegmentsOverlay = document.createElement('div');
    this.sliderSegmentsOverlay.className =
      'ytaf-sponsorblock-segment-container';

    this.segments.forEach((segment) => {
      const [start, end] = segment.segment;
      const barType = barTypes[segment.category] || {
        color: 'blue'
      };
      const elm = document.createElement('div');
      elm.className = 'ytaf-sponsorblock-segment';
      elm.style['background-color'] = barType.color;
      elm.style['left'] = `${(start / videoDuration) * 100.0}%`;
      elm.style['width'] = `${((end - start) / videoDuration) * 100.0}%`;
      this.sliderSegmentsOverlay.appendChild(elm);
    });

    const addSliderObserver = (ele) => {
      this.sliderObserver.observe(ele, {
        childList: true,
        subtree: true
      });
    };

    const addSliderOverlay = () => {
      this.slider.appendChild(this.sliderSegmentsOverlay);
    };

    const watchForSlider = () => {
      if (this.sliderInterval) clearInterval(this.sliderInterval);

      this.sliderInterval = setInterval(() => {
        const nodes = document.querySelectorAll('[idomkey=progress-bar]');
        const last = nodes[nodes.length - 1];
        switch (nodes.length) {
          case 3: {
            // Slider has chapter markers.
            this.slider = last;
            break;
          }
          case 2: {
            // Slider has no markers or auto-markers
            this.slider = last.querySelector('[idomkey=slider]');
            break;
          }
          default: {
            return; // no slider found yet
          }
        }

        console.debug('slider found...', this.slider);
        clearInterval(this.sliderInterval);
        this.sliderInterval = null;
        addSliderObserver(last);
        addSliderOverlay();
      }, 100);
    };

    this.sliderObserver = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.removedNodes) {
          for (const node of m.removedNodes) {
            if (node === this.sliderSegmentsOverlay) {
              console.debug('bringing back segments overlay');
              addSliderOverlay();
            }
            if (node === this.slider) {
              console.debug('slider removed, watching again');
              this.sliderObserver.disconnect();
              watchForSlider();
            }
          }
        }
      });
    });

    watchForSlider();
  }

  scheduleSkip() {
    clearTimeout(this.nextSkipTimeout);
    this.nextSkipTimeout = null;

    if (!this.active) {
      console.debug(this.videoID, 'No longer active, ignoring...');
      return;
    }

    if (this.video.paused) {
      console.debug(this.videoID, 'Currently paused, ignoring...');
      return;
    }

    // Sometimes timeupdate event (that calls scheduleSkip) gets fired right before
    // already scheduled skip routine below. Let's just look back a little bit
    // and, in worst case, perform a skip at negative interval (immediately)...
    const nextSegments = this.segments.filter(
      (seg) =>
        seg.segment[0] > this.video.currentTime - 0.3 &&
        seg.segment[1] > this.video.currentTime - 0.3
    );
    nextSegments.sort((s1, s2) => s1.segment[0] - s2.segment[0]);

    if (!nextSegments.length) {
      console.debug(this.videoID, 'No more segments');
      return;
    }

    const [segment] = nextSegments;
    const [start, end] = segment.segment;
    console.debug(
      this.videoID,
      'Scheduling skip of',
      segment,
      'in',
      start - this.video.currentTime
    );

    this.nextSkipTimeout = setTimeout(
      () => {
        if (this.video.paused) {
          console.debug(this.videoID, 'Currently paused, ignoring...');
          return;
        }
        // Read the settings at skip time so changes apply mid-video.
        const mode = getCategoryMode(segment.category);
        const id = segment.UUID ?? `${start}-${end}`;

        const minLength = Number(configRead('sponsorBlockMinLength')) || 0;
        if (end - start < minLength) {
          console.debug(this.videoID, 'Segment too short, ignoring', segment);
          return;
        }

        const skipName = segmentName(segment.category);

        if (mode === 'manual') {
          if (!this.notifiedSegments.has(id)) {
            this.notifiedSegments.add(id);
            // Always shown: without it the viewer can't know to press.
            showNotification(
              t('msg.askSkip', 'Press {button} to skip {name}', {
                button: buttonLabel(),
                name: skipName
              }),
              Math.min(Math.max((end - start) * 1000, 2000), 8000),
              'yellow'
            );
          }
          return;
        }

        if (mode !== 'skip') {
          console.debug(
            this.videoID,
            'Segment',
            segment.category,
            'is not skippable, ignoring...'
          );
          return;
        }

        if (
          configRead('sponsorBlockSkipOnce') &&
          this.skippedSegments.has(id)
        ) {
          console.debug(this.videoID, 'Already skipped once', segment);
          return;
        }
        this.skippedSegments.add(id);

        console.debug(this.videoID, 'Skipping', segment);
        notify(t('msg.skipping', 'Skipping {name}', { name: skipName }));
        this.video.currentTime = end;
        this.scheduleSkip();
      },
      (start - this.video.currentTime) * 1000
    );
  }

  destroy() {
    console.debug(this.videoID, 'Destroying');

    this.active = false;

    if (this.nextSkipTimeout) {
      clearTimeout(this.nextSkipTimeout);
      this.nextSkipTimeout = null;
    }

    if (this.attachVideoTimeout) {
      clearTimeout(this.attachVideoTimeout);
      this.attachVideoTimeout = null;
    }

    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = null;
    }

    if (this.sliderObserver) {
      this.sliderObserver.disconnect();
      this.sliderObserver = null;
    }

    if (this.sliderSegmentsOverlay) {
      this.sliderSegmentsOverlay.remove();
      this.sliderSegmentsOverlay = null;
    }

    if (this.video) {
      this.video.removeEventListener('play', this.scheduleSkipHandler);
      this.video.removeEventListener('pause', this.scheduleSkipHandler);
      this.video.removeEventListener('timeupdate', this.scheduleSkipHandler);
      this.video.removeEventListener(
        'durationchange',
        this.durationChangeHandler
      );
    }
  }
}

// When this global variable was declared using let and two consecutive hashchange
// events were fired (due to bubbling? not sure...) the second call handled below
// would not see the value change from first call, and that would cause multiple
// SponsorBlockHandler initializations... This has been noticed on Chromium 38.
// This either reveals some bug in chromium/webpack/babel scope handling, or
// shows my lack of understanding of javascript. (or both)
window.sponsorblock = null;

function uninitializeSponsorblock() {
  if (!window.sponsorblock) {
    return;
  }
  try {
    window.sponsorblock.destroy();
  } catch (err) {
    console.warn('window.sponsorblock.destroy() failed!', err);
  }
  window.sponsorblock = null;
}

window.addEventListener(
  'hashchange',
  () => {
    const newURL = new URL(location.hash.substring(1), location.href);
    // uninitialize sponsorblock when not on `/watch` path, to prevent
    // it from attaching to playback preview video element loaded on
    // home page
    if (newURL.pathname !== '/watch' && window.sponsorblock) {
      console.debug('uninitializing sponsorblock on a non-video page');
      uninitializeSponsorblock();
      return;
    }

    const videoID = newURL.searchParams.get('v');
    const needsReload =
      videoID &&
      (!window.sponsorblock || window.sponsorblock.videoID != videoID);

    console.debug(
      'hashchange',
      videoID,
      window.sponsorblock,
      window.sponsorblock ? window.sponsorblock.videoID : null,
      needsReload
    );

    if (needsReload) {
      uninitializeSponsorblock();

      if (configRead('enableSponsorBlock')) {
        window.sponsorblock = new SponsorBlockHandler(videoID);
        window.sponsorblock.init();
      } else {
        console.info('SponsorBlock disabled, not loading');
      }
    }
  },
  false
);

setColorActionHandler('sponsorblock', () => {
  if (!document.body.classList.contains('WEB_PAGE_TYPE_WATCH')) return false;
  return window.sponsorblock?.handleButton() ?? false;
});

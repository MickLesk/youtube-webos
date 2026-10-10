import { configRead, configAddChangeListener } from './config';
import './watch.css';
import { requireElement } from './player_api/helpers';

/**
 * Format the clock according to the clock settings. `hour12` is left to the
 * locale in automatic mode.
 * @param {Date} date
 */
function formatClock(date) {
  const format = configRead('clockFormat');
  /** @type {Intl.DateTimeFormatOptions} */
  const timeOptions = { hour: 'numeric', minute: 'numeric' };
  if (format === '24h') timeOptions.hour12 = false;
  if (format === '12h') timeOptions.hour12 = true;

  const time = new Intl.DateTimeFormat(navigator.language, timeOptions).format(
    date
  );
  if (!configRead('clockShowDate')) return time;

  const day = new Intl.DateTimeFormat(navigator.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric'
  }).format(date);
  return `${day}  ${time}`;
}

class Watch {
  #watch;
  #timer;
  #attrChanges;
  #player;
  #setTime;
  #PLAYER_SELECTOR = 'ytlr-watch-default';

  constructor() {
    this.createElement();
    this.startClock();
    this.playerEvents();
  }

  createElement() {
    this.#watch = document.createElement('div');
    this.#watch.className = 'webOs-watch';
    document.body.appendChild(this.#watch);
  }

  startClock() {
    const nextSeg = (60 - new Date().getSeconds()) * 1000;

    const setTime = () => {
      this.#watch.innerText = formatClock(new Date());
    };
    this.#setTime = setTime;

    setTime();
    setTimeout(() => {
      setTime();
      this.#timer = setInterval(setTime, 60000);
    }, nextSeg);
  }

  refresh() {
    if (this.#player) this.changeVisibility(this.#player);
    this.#setTime?.();
  }

  playerAppear(video) {
    this.#player = video;
    this.changeVisibility(video);
    this.playerObserver(video);
  }

  changeVisibility(video) {
    const focused = video.getAttribute('hybridnavfocusable') === 'true';
    const always = configRead('showWatchAlways');
    this.#watch.style.display = focused && !always ? 'none' : 'block';
  }

  async playerEvents() {
    const player = await requireElement(this.#PLAYER_SELECTOR, HTMLElement);
    this.playerAppear(player);
  }

  playerObserver(node) {
    this.#attrChanges = new MutationObserver(() => {
      this.changeVisibility(node);
    });

    this.#attrChanges.observe(node, {
      attributes: true,
      attributeFilter: ['hybridnavfocusable']
    });
  }

  destroy() {
    clearInterval(this.#timer);
    this.#watch?.remove();
    this.#attrChanges?.disconnect();
  }
}

let watchInstance = null;

function toggleWatch(show) {
  if (show) {
    watchInstance = watchInstance ? watchInstance : new Watch();
  } else {
    watchInstance?.destroy();
    watchInstance = null;
  }
}

toggleWatch(configRead('showWatch'));

configAddChangeListener('showWatch', (evt) => {
  toggleWatch(evt.detail.newValue);
});

configAddChangeListener('showWatchAlways', () => {
  watchInstance?.refresh();
});

for (const key of ['clockFormat', 'clockShowDate']) {
  configAddChangeListener(key, () => watchInstance?.refresh());
}

/**
 * Shows like/dislike counts from the Return YouTube Dislike API while the
 * player controls are visible.
 */
import { configAddChangeListener, configRead } from './config';
import { getPlayerManager, PlayerMode } from './player_api';
import { requireElement } from './player_api/helpers';

const API = 'https://returnyoutubedislikeapi.com/votes';
const PLAYER_SELECTOR = 'ytlr-watch-default';

const playerManager = await getPlayerManager();

const elm = document.createElement('div');
elm.className = 'ytaf-dislikes';
elm.style.display = 'none';
document.body.appendChild(elm);

let currentVideo: string | null = null;
let hasData = false;
let controlsVisible = false;

const formatter = new Intl.NumberFormat(navigator.language, {
  notation: 'compact'
} as Intl.NumberFormatOptions);

function format(n: number) {
  try {
    return formatter.format(n);
  } catch {
    return String(n);
  }
}

function render() {
  const visible =
    configRead('enableReturnDislike') &&
    hasData &&
    controlsVisible &&
    document.body.classList.contains('WEB_PAGE_TYPE_WATCH');
  elm.style.display = visible ? 'block' : 'none';
}

async function load(videoId: string) {
  hasData = false;
  render();

  try {
    const resp = await fetch(`${API}?videoId=${encodeURIComponent(videoId)}`);
    if (!resp.ok) return;
    const data = (await resp.json()) as { likes?: number; dislikes?: number };
    if (currentVideo !== videoId) return;
    if (typeof data.dislikes !== 'number') return;

    const likes = typeof data.likes === 'number' ? data.likes : null;
    elm.textContent =
      (likes !== null ? `Likes ${format(likes)}  \u00B7  ` : '') +
      `Dislikes ${format(data.dislikes)}`;
    hasData = true;
    render();
  } catch (err) {
    console.debug('[return-dislike] request failed', err);
  }
}

playerManager.addEventListener('newVideo', function (evt) {
  currentVideo = evt.detail;
  hasData = false;
  render();
  if (
    configRead('enableReturnDislike') &&
    this.playerMode === PlayerMode.NORMAL
  )
    void load(evt.detail);
});

configAddChangeListener('enableReturnDislike', () => {
  const id = playerManager.currentVideoID;
  if (configRead('enableReturnDislike') && id && !hasData) {
    currentVideo = id;
    void load(id);
  }
  render();
});

new MutationObserver(render).observe(document.body, {
  attributes: true,
  attributeFilter: ['class']
});

// The watch page marks the player focusable while controls are hidden.
// Not awaited at the top level so other modules don't wait for playback.
void requireElement(PLAYER_SELECTOR, HTMLElement).then((player) => {
  const updateControls = () => {
    controlsVisible = player.getAttribute('hybridnavfocusable') !== 'true';
    render();
  };
  new MutationObserver(updateControls).observe(player, {
    attributes: true,
    attributeFilter: ['hybridnavfocusable']
  });
  updateControls();
});

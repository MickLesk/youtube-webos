/**
 * Shows like/dislike counts from the Return YouTube Dislike API while the
 * player controls are visible.
 */
import { configAddChangeListener, configRead } from './config';
import { getPlayerManager, PlayerMode } from './player_api';
import { addOverlayLine } from './player-overlay';

const API = 'https://returnyoutubedislikeapi.com/votes';

const playerManager = await getPlayerManager();

const { line: elm, refresh } = addOverlayLine('ytaf-dislikes');

let currentVideo: string | null = null;
let hasData = false;

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
  const visible = configRead('enableReturnDislike') && hasData;
  elm.style.display = visible ? 'block' : 'none';
  refresh();
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

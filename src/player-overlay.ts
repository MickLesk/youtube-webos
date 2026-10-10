/**
 * A small info box in the top-left corner of the watch page that is only
 * visible while the player controls are shown. Features add lines to it.
 */
import { requireElement } from './player_api/helpers';

const PLAYER_SELECTOR = 'ytlr-watch-default';

const box = document.createElement('div');
box.className = 'ytaf-player-overlay';
box.style.display = 'none';
document.body.appendChild(box);

let controlsVisible = false;
const visibilityListeners: ((visible: boolean) => void)[] = [];

function isWatchPage() {
  return document.body.classList.contains('WEB_PAGE_TYPE_WATCH');
}

export function isOverlayVisible() {
  return controlsVisible && isWatchPage();
}

function update() {
  const visible = isOverlayVisible();
  const hasContent = Array.prototype.some.call(
    box.children,
    (child: HTMLElement) => child.style.display !== 'none'
  );
  box.style.display = visible && hasContent ? 'block' : 'none';
  for (const listener of visibilityListeners) listener(visible);
}

/**
 * Add a line to the overlay. Hide it with `style.display = 'none'` and call
 * the returned `refresh` after changing it.
 */
export function addOverlayLine(className: string) {
  const line = document.createElement('div');
  line.className = className;
  line.style.display = 'none';
  box.appendChild(line);
  return { line, refresh: update };
}

/** Called whenever the overlay may have been shown or hidden. */
export function onOverlayVisibility(listener: (visible: boolean) => void) {
  visibilityListeners.push(listener);
}

new MutationObserver(update).observe(document.body, {
  attributes: true,
  attributeFilter: ['class']
});

// The watch page marks the player focusable while controls are hidden.
void requireElement(PLAYER_SELECTOR, HTMLElement).then((player) => {
  const updateControls = () => {
    controlsVisible = player.getAttribute('hybridnavfocusable') !== 'true';
    update();
  };
  new MutationObserver(updateControls).observe(player, {
    attributes: true,
    attributeFilter: ['hybridnavfocusable']
  });
  updateControls();
});

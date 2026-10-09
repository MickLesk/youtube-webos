import { configAddChangeListener, configRead } from './config';
import { getPlayer } from './player_api/helpers';

/**
 * Mute the inline video previews shown while browsing.
 *
 * YouTube TV re-uses the same <video> element for previews and regular
 * playback, so only unmute what we muted ourselves.
 */
const player = await getPlayer();

let mutedByUs = false;

function update() {
  const video = player.querySelector('video');
  if (!video) return;

  const shouldMute = configRead('mutePreviews') && player.isInline();

  if (shouldMute && !video.muted) {
    video.muted = true;
    mutedByUs = true;
  } else if (!shouldMute && mutedByUs) {
    video.muted = false;
    mutedByUs = false;
  }
}

for (const type of ['play', 'playing']) {
  document.addEventListener(
    type,
    (evt) => {
      if (evt.target instanceof HTMLVideoElement) update();
    },
    true
  );
}

player.addEventListener('onStateChange', update);
configAddChangeListener('mutePreviews', update);

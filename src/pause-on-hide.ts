/**
 * Pauses the video when the TV switches to another input, another app or
 * standby, so nothing keeps playing in the background and the position is
 * saved (resume-position listens for the pause).
 */
import { configRead } from './config';
import { t } from './i18n';
import { getPlayerManager, PlayerMode } from './player_api';
import { showNotification } from './ui';

const playerManager = await getPlayerManager();

function onHidden() {
  if (!document.hidden || !configRead('pauseOnHide')) return;
  if (playerManager.playerMode !== PlayerMode.NORMAL) return;
  const video = playerManager.player.querySelector('video');
  if (!video || video.paused) return;
  video.pause();
  showNotification(t('msg.pausedHidden', 'Paused, position saved'), 2000);
}

document.addEventListener('visibilitychange', onHidden);
// webOS also tells the app when it goes to the background.
document.addEventListener('webOSRelaunch', onHidden);
window.addEventListener('blur', () => setTimeout(onHidden, 0));

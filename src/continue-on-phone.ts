/**
 * Shows a QR code with the current video and position, so a phone can pick
 * up where the TV is. Opened with a color button or from the quick menu;
 * closes with any key or after a while.
 */
import * as qrModule from 'qrcode-generator';

import { t } from './i18n';
import { isWatchPage, onPageChange } from './page-state';
import { getPlayerManager, PlayerMode } from './player_api';
import { setColorActionHandler } from './ui';

interface QRCode {
  addData(data: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}
type QRFactory = (typeNumber: number, level: 'L' | 'M' | 'Q' | 'H') => QRCode;

// The package exports the factory both as default and as `qrcode`.
const createQr = ((qrModule as unknown as { default?: unknown }).default ??
  (qrModule as unknown as { qrcode?: unknown }).qrcode ??
  qrModule) as QRFactory;

const AUTO_CLOSE_MS = 45000;
const SVG_NS = 'http://www.w3.org/2000/svg';

const playerManager = await getPlayerManager();

const box = document.createElement('div');
box.className = 'ytaf-phone-qr';
box.style.display = 'none';
const elmCode = document.createElement('div');
elmCode.className = 'ytaf-phone-qr-code';
const elmTitle = document.createElement('div');
elmTitle.className = 'ytaf-phone-qr-title';
const elmUrl = document.createElement('div');
elmUrl.className = 'ytaf-phone-qr-url';
const elmHint = document.createElement('div');
elmHint.className = 'ytaf-phone-qr-hint';
box.appendChild(elmTitle);
box.appendChild(elmCode);
box.appendChild(elmUrl);
box.appendChild(elmHint);
document.body.appendChild(box);

let visible = false;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function renderCode(text: string) {
  const qr = createQr(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const margin = 2;
  const size = count + margin * 2;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', String(size));
  bg.setAttribute('height', String(size));
  bg.setAttribute('fill', '#fff');
  svg.appendChild(bg);

  let d = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        d += `M${col + margin} ${row + margin}h1v1h-1z`;
      }
    }
  }
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#000');
  svg.appendChild(path);

  elmCode.textContent = '';
  elmCode.appendChild(svg);
}

function close() {
  visible = false;
  clearTimeout(closeTimer);
  box.style.display = 'none';
}

function open() {
  const videoId = playerManager.currentVideoID;
  const video = playerManager.player.querySelector('video');
  if (!videoId) return false;
  const seconds = Math.max(0, Math.floor(video ? video.currentTime : 0));
  const url = `https://youtu.be/${videoId}?t=${seconds}`;

  renderCode(url);
  elmTitle.textContent = t('msg.continueOnPhone', 'Continue on your phone');
  elmUrl.textContent = url;
  elmHint.textContent = t(
    'msg.continueOnPhoneHint',
    'Scan with the camera. Any key closes this.'
  );
  box.style.display = 'block';
  visible = true;
  clearTimeout(closeTimer);
  closeTimer = setTimeout(close, AUTO_CLOSE_MS);
  return true;
}

setColorActionHandler('phoneQr', () => {
  if (visible) {
    close();
    return true;
  }
  if (!isWatchPage() || playerManager.playerMode !== PlayerMode.NORMAL) {
    return false;
  }
  return open();
});

// Any key closes the code; the color key that opened it is handled above.
window.addEventListener(
  'keydown',
  (evt) => {
    if (!visible || (evt.keyCode >= 403 && evt.keyCode <= 406)) return;
    close();
    evt.preventDefault();
    evt.stopPropagation();
  },
  true
);
onPageChange(() => {
  if (visible && !isWatchPage()) close();
});

export function isPhoneQrVisible() {
  return visible;
}

/**
 * Shows the chat of live streams, and the chat replay of past streams, in a
 * panel on the right side of the player. The TV app has no chat of its own,
 * so the messages are loaded through the web client's chat API.
 */
import { configAddChangeListener, configRead } from './config';
import { t } from './i18n';
import { getPlayerManager, PlayerMode } from './player_api';
import { setColorActionHandler, showNotification } from './ui';
import { isWatchPage, onPageChange } from './page-state';

type Json = Record<string, unknown>;

const MAX_MESSAGES = 12;
const WEB_CLIENT = { clientName: 'WEB', clientVersion: '2.20250925.01.00' };

function get(value: unknown, ...path: (string | number)[]): unknown {
  let cur = value;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

async function api(endpoint: string, body: Json): Promise<Json> {
  const resp = await fetch(`/youtubei/v1/${endpoint}?prettyPrint=false`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: { client: { ...WEB_CLIENT, hl: navigator.language } },
      ...body
    })
  });
  if (!resp.ok) throw new Error(`${endpoint}: HTTP ${resp.status}`);
  return (await resp.json()) as Json;
}

/* --------------------------------- View -------------------------------- */

const panel = document.createElement('div');
panel.className = 'ytaf-live-chat';
panel.style.display = 'none';
document.body.appendChild(panel);

let chatHidden = false;
let hasSession = false;

const playerManager = await getPlayerManager();

function render() {
  const visible =
    configRead('enableLiveChat') &&
    hasSession &&
    !chatHidden &&
    isWatchPage() &&
    playerManager.playerMode === PlayerMode.NORMAL;
  panel.style.display = visible ? 'block' : 'none';
}

onPageChange(render);

interface ChatMessage {
  author: string;
  text: string;
  amount: string;
  offsetMs: number;
}

function runsText(runs: unknown): string {
  if (!Array.isArray(runs)) return '';
  return runs
    .map((run) => {
      if (typeof get(run, 'text') === 'string')
        return get(run, 'text') as string;
      const emoji = get(run, 'emoji');
      if (!emoji) return '';
      if (get(emoji, 'isCustomEmoji')) {
        const shortcut = get(emoji, 'shortcuts', 0);
        return typeof shortcut === 'string' ? shortcut : '';
      }
      const id = get(emoji, 'emojiId');
      return typeof id === 'string' ? id : '';
    })
    .join('');
}

function parseItem(item: unknown, offsetMs: number): ChatMessage | null {
  const renderer =
    get(item, 'liveChatTextMessageRenderer') ??
    get(item, 'liveChatPaidMessageRenderer');
  if (!renderer) return null;
  const text = runsText(get(renderer, 'message', 'runs'));
  const amount = get(renderer, 'purchaseAmountText', 'simpleText');
  if (!text && !amount) return null;
  return {
    author: String(get(renderer, 'authorName', 'simpleText') ?? ''),
    text,
    amount: typeof amount === 'string' ? amount : '',
    offsetMs
  };
}

function showMessage(message: ChatMessage) {
  const line = document.createElement('div');
  line.className = 'ytaf-live-chat-line';

  const author = document.createElement('span');
  author.className = 'ytaf-live-chat-author';
  author.textContent = message.amount
    ? `${message.author} (${message.amount})`
    : message.author;
  line.appendChild(author);
  line.appendChild(document.createTextNode(` ${message.text}`));
  if (message.amount) line.className += ' ytaf-live-chat-paid';

  panel.appendChild(line);
  while (panel.children.length > MAX_MESSAGES) {
    panel.removeChild(panel.firstChild!);
  }
}

/* ------------------------------- Sessions ------------------------------ */

let session = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function stop() {
  session++;
  hasSession = false;
  if (timer) clearTimeout(timer);
  timer = null;
  while (panel.firstChild) panel.removeChild(panel.firstChild);
  render();
}

async function pollLive(id: number, continuation: string) {
  if (id !== session) return;
  let next = continuation;
  let timeout = 5000;
  try {
    const res = await api('live_chat/get_live_chat', { continuation });
    if (id !== session) return;
    const chat = get(res, 'continuationContents', 'liveChatContinuation');
    const actions = get(chat, 'actions');
    if (Array.isArray(actions)) {
      for (const action of actions) {
        const message = parseItem(get(action, 'addChatItemAction', 'item'), 0);
        if (message) showMessage(message);
      }
    }
    const cont =
      get(chat, 'continuations', 0, 'invalidationContinuationData') ??
      get(chat, 'continuations', 0, 'timedContinuationData');
    const contId = get(cont, 'continuation');
    if (typeof contId !== 'string') return; // Stream ended.
    next = contId;
    timeout = Number(get(cont, 'timeoutMs')) || timeout;
  } catch (err) {
    console.debug('[live-chat] poll failed', err);
    timeout = 10000;
  }
  timer = setTimeout(
    () => void pollLive(id, next),
    Math.min(Math.max(timeout, 2000), 10000)
  );
}

/* Replay: messages are loaded ahead and shown at their position in the video. */

interface ReplayState {
  start: string;
  next: string | null;
  buffer: ChatMessage[];
  loading: boolean;
  lastTimeMs: number;
}

async function loadReplay(id: number, state: ReplayState, seekMs?: number) {
  const continuation = seekMs === undefined ? state.next : state.start;
  if (!continuation) return;
  state.loading = true;
  try {
    const res = await api('live_chat/get_live_chat_replay', {
      continuation,
      currentPlayerState: {
        playerOffsetMs: String(Math.floor(seekMs ?? state.lastTimeMs))
      }
    });
    if (id !== session) return;
    const chat = get(res, 'continuationContents', 'liveChatContinuation');
    const actions = get(chat, 'actions');
    if (Array.isArray(actions)) {
      for (const action of actions) {
        const replay = get(action, 'replayChatItemAction');
        const offsetMs = Number(get(replay, 'videoOffsetTimeMsec')) || 0;
        const inner = get(replay, 'actions');
        if (!Array.isArray(inner)) continue;
        for (const innerAction of inner) {
          const message = parseItem(
            get(innerAction, 'addChatItemAction', 'item'),
            offsetMs
          );
          if (message) state.buffer.push(message);
        }
      }
    }
    const next = get(
      chat,
      'continuations',
      0,
      'liveChatReplayContinuationData',
      'continuation'
    );
    state.next = typeof next === 'string' ? next : null;
  } catch (err) {
    console.debug('[live-chat] replay failed', err);
  } finally {
    state.loading = false;
  }
}

function tickReplay(id: number, state: ReplayState) {
  if (id !== session) return;
  const video = document.querySelector('video');
  const nowMs = video ? video.currentTime * 1000 : 0;

  // A seek: start over from the new position.
  if (Math.abs(nowMs - state.lastTimeMs) > 5000) {
    state.buffer = [];
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    state.lastTimeMs = nowMs;
    if (!state.loading) void loadReplay(id, state, nowMs);
  }
  state.lastTimeMs = nowMs;

  while (state.buffer.length && state.buffer[0]!.offsetMs <= nowMs) {
    const message = state.buffer.shift()!;
    // Skip what is long past, e.g. after loading from an earlier position.
    if (nowMs - message.offsetMs < 10000) showMessage(message);
  }

  if (!state.loading && state.buffer.length < 20 && state.next) {
    void loadReplay(id, state);
  }

  timer = setTimeout(() => tickReplay(id, state), 500);
}

async function start(videoId: string) {
  stop();
  const id = session;

  let renderer: unknown;
  try {
    const res = await api('next', { videoId });
    renderer = get(
      res,
      'contents',
      'twoColumnWatchNextResults',
      'conversationBar',
      'liveChatRenderer'
    );
  } catch (err) {
    console.debug('[live-chat] no chat', err);
    return;
  }
  if (id !== session || !renderer) return;

  const continuation = get(
    renderer,
    'continuations',
    0,
    'reloadContinuationData',
    'continuation'
  );
  if (typeof continuation !== 'string') return;

  hasSession = true;
  render();

  if (get(renderer, 'isReplay')) {
    const video = document.querySelector('video');
    const nowMs = video ? video.currentTime * 1000 : 0;
    const state: ReplayState = {
      start: continuation,
      next: null,
      buffer: [],
      loading: false,
      lastTimeMs: nowMs
    };
    await loadReplay(id, state, nowMs);
    tickReplay(id, state);
  } else {
    void pollLive(id, continuation);
  }
}

function update() {
  const videoId = playerManager.currentVideoID;
  if (
    !configRead('enableLiveChat') ||
    !videoId ||
    playerManager.playerMode !== PlayerMode.NORMAL
  ) {
    stop();
    return;
  }
  void start(videoId);
}

playerManager.addEventListener('newVideo', update);
configAddChangeListener('enableLiveChat', update);

setColorActionHandler('liveChat', () => {
  if (!hasSession) {
    showNotification(t('msg.noLiveChat', 'No chat for this video'));
    return true;
  }
  chatHidden = !chatHidden;
  render();
  return true;
});

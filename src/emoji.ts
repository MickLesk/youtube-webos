/**
 * Older webOS versions have no color emoji font and show empty boxes.
 * This replaces emoji in titles, descriptions and the live chat with
 * Twemoji images (upstream #257).
 *
 * Twemoji graphics by Twitter/X and contributors, CC-BY 4.0.
 */
import { configAddChangeListener, configRead } from './config';

const BASE_URL =
  'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/72x72/';
const SELECTOR = 'yt-formatted-string, .ytaf-live-chat-line';

// No `u` flag on old browsers: emoji are matched as surrogate pairs.
const MODIFIER = '(?:\\ufe0f|\\ud83c[\\udffb-\\udfff])*';
const BASE =
  '(?:\\ud83c[\\udc04-\\udfff]|\\ud83d[\\udc00-\\udfff]|\\ud83e[\\udc00-\\udfff]' +
  '|[\\u2600-\\u27bf]|[\\u2b05-\\u2b55]|[\\u231a\\u231b\\u2328\\u23cf\\u23e9-\\u23f3\\u23f8-\\u23fa])';
const EMOJI_RE = new RegExp(
  '[#*0-9]\\ufe0f?\\u20e3' +
    '|(?:\\ud83c[\\udde6-\\uddff]){2}' +
    `|${BASE}${MODIFIER}(?:\\u200d${BASE}${MODIFIER})*`,
  'g'
);

/** Twemoji file name: code points in hex, without FE0F unless joined. */
export function emojiFileName(emoji: string): string {
  const text = emoji.indexOf('‍') === -1 ? emoji.replace(/️/g, '') : emoji;
  const points: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const next = text.charCodeAt(i + 1);
    if (code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
      points.push(
        ((code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000).toString(16)
      );
      i++;
    } else {
      points.push(code.toString(16));
    }
  }
  return points.join('-');
}

function createImage(emoji: string) {
  const img = document.createElement('img');
  img.className = 'ytaf-emoji';
  img.alt = emoji;
  img.draggable = false;
  img.src = `${BASE_URL}${emojiFileName(emoji)}.png`;
  // No image for this character: show the text again.
  img.onerror = () => {
    img.parentNode?.replaceChild(document.createTextNode(emoji), img);
  };
  return img;
}

function replaceInTextNode(node: Text) {
  const text = node.data;
  EMOJI_RE.lastIndex = 0;
  if (!EMOJI_RE.test(text)) return;

  const fragment = document.createDocumentFragment();
  let last = 0;
  EMOJI_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMOJI_RE.exec(text))) {
    if (match.index > last) {
      fragment.appendChild(
        document.createTextNode(text.slice(last, match.index))
      );
    }
    fragment.appendChild(createImage(match[0]));
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(last)));
  }
  node.parentNode?.replaceChild(fragment, node);
}

export function replaceEmoji(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) replaceInTextNode(node);
}

function process(node: Node) {
  if (!(node instanceof Element)) {
    // Text changed inside a title.
    const parent = node.parentNode;
    if (parent instanceof Element && parent.matches(SELECTOR)) {
      replaceEmoji(parent);
    }
    return;
  }
  if (node.matches(SELECTOR)) replaceEmoji(node);
  const inner = node.querySelectorAll(SELECTOR);
  for (let i = 0; i < inner.length; i++) replaceEmoji(inner[i]!);
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'characterData') {
      process(mutation.target);
      continue;
    }
    for (let i = 0; i < mutation.addedNodes.length; i++) {
      process(mutation.addedNodes[i]!);
    }
  }
});

function update() {
  observer.disconnect();
  if (
    !configRead('twemoji') ||
    document.characterSet.toUpperCase() !== 'UTF-8'
  ) {
    return;
  }
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  process(document.body);
}

configAddChangeListener('twemoji', update);
update();

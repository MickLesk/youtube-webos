/**
 * A "Continue watching" row at the top of Home, built from the positions
 * stored by resume-position, so it also works without the YouTube history.
 * Tiles are copies of a tile YouTube sent, with the video swapped in.
 */
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';
import { t } from './i18n';
import { getContinueWatching } from './resume-position';
import type { ContinueEntry } from './resume-position';

type Json = Record<string, unknown>;

const MAX_ITEMS = 12;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function get(value: unknown, ...path: (string | number)[]): unknown {
  let cur = value;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatTime(seconds: number) {
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function isHome() {
  const path = location.hash.replace(/^#/, '');
  return path === '' || path === '/' || path.indexOf('/?') === 0;
}

/** First video tile of the classic kind, to copy the layout from. */
function findTemplate(node: unknown, depth = 0): Json | null {
  if (depth > 30 || typeof node !== 'object' || node === null) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findTemplate(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const tile = (node as Json).tileRenderer;
  if (
    isObject(tile) &&
    isObject(get(tile, 'onSelectCommand', 'watchEndpoint')) &&
    isObject(get(tile, 'header', 'tileHeaderRenderer')) &&
    isObject(get(tile, 'metadata', 'tileMetadataRenderer'))
  ) {
    return node as Json;
  }
  for (const key in node as Json) {
    const found = findTemplate((node as Json)[key], depth + 1);
    if (found) return found;
  }
  return null;
}

const line = (text: string) => ({
  lineRenderer: {
    items: [{ lineItemRenderer: { text: { simpleText: text } } }]
  }
});

function buildTile(template: Json, entry: ContinueEntry): Json {
  const item = clone(template);
  const tile = item.tileRenderer as Json;
  tile.contentId = entry.videoId;
  const select = get(tile, 'onSelectCommand') as Json;
  const endpoint = select.watchEndpoint as Json;
  for (const key of Object.keys(endpoint)) {
    if (key !== 'videoId') delete endpoint[key];
  }
  endpoint.videoId = entry.videoId;
  // No preview and no long-press menu copied from another video.
  delete tile.onFocusCommand;
  delete tile.onLongPressCommand;

  const header = get(tile, 'header', 'tileHeaderRenderer') as Json;
  header.thumbnail = {
    thumbnails: [{ url: entry.thumb, width: 480, height: 270 }]
  };
  delete header.movingThumbnail;
  const overlays: Json[] = [];
  if (entry.len > 0) {
    overlays.push({
      thumbnailOverlayTimeStatusRenderer: {
        text: { simpleText: formatTime(entry.len) },
        style: 'DEFAULT'
      }
    });
    overlays.push({
      thumbnailOverlayResumePlaybackRenderer: {
        percentDurationWatched: Math.round((entry.time / entry.len) * 100)
      }
    });
  }
  header.thumbnailOverlays = overlays;

  const metadata = get(tile, 'metadata', 'tileMetadataRenderer') as Json;
  metadata.title = { simpleText: entry.title };
  metadata.lines = [
    line(entry.author),
    line(
      t('ui.continueAt', 'Continue at {time}', { time: formatTime(entry.time) })
    )
  ];
  return item;
}

/** Replace the first text-like `title` outside of the shelf's content. */
function setTitle(node: unknown, title: string, depth = 0): boolean {
  if (depth > 6 || !isObject(node)) return false;
  for (const key in node) {
    if (key === 'content') continue;
    const value = node[key];
    if (
      key === 'title' &&
      isObject(value) &&
      ('runs' in value || 'simpleText' in value)
    ) {
      node[key] = { runs: [{ text: title }] };
      return true;
    }
    if (setTitle(value, title, depth + 1)) return true;
  }
  return false;
}

addParseHandler('continue-watching', (res) => {
  if (!configRead('continueWatchingRow') || !isHome()) return;

  const contents = get(
    res,
    'contents',
    'tvBrowseRenderer',
    'content',
    'tvSurfaceContentRenderer',
    'content',
    'sectionListRenderer',
    'contents'
  );
  if (!Array.isArray(contents)) return;

  const entries = getContinueWatching(MAX_ITEMS).filter((e) => e.thumb);
  if (!entries.length) return;

  let shelfTemplate: Json | null = null;
  for (const section of contents) {
    if (
      Array.isArray(
        get(
          section,
          'shelfRenderer',
          'content',
          'horizontalListRenderer',
          'items'
        )
      )
    ) {
      shelfTemplate = section as Json;
      break;
    }
  }
  const tileTemplate = findTemplate(contents);
  if (!shelfTemplate || !tileTemplate) return;

  const shelf = clone(shelfTemplate);
  const list = get(
    shelf,
    'shelfRenderer',
    'content',
    'horizontalListRenderer'
  ) as Json;
  list.items = entries.map((entry) => buildTile(tileTemplate, entry));
  delete list.continuations;
  setTitle(shelf.shelfRenderer, t('ui.continueWatching', 'Continue watching'));
  contents.unshift(shelf);
});

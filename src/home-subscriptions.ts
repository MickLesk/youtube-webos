/**
 * Puts the newest videos from subscriptions in a row at the top of Home.
 * The videos are loaded in the background and kept, so Home is never
 * delayed; the row shows what was loaded last.
 */
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';
import { t } from './i18n';
import { innertubeFetch } from './innertube';
import { createLogger } from './logger';

type Json = Record<string, unknown>;

const STORAGE_KEY = 'ytaf-home-subscriptions';
const MAX_ITEMS = 24;
const REFRESH_MS = 15 * 60 * 1000;

const logger = createLogger('home-subscriptions');

interface Cache {
  at: number;
  items: Json[];
}

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

function readCache(): Cache | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const cache = raw ? (JSON.parse(raw) as Cache) : null;
    return cache && Array.isArray(cache.items) ? cache : null;
  } catch {
    return null;
  }
}

function writeCache(cache: Cache) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full: the row simply stays empty.
  }
}

function isVideoTile(node: Json) {
  if (isObject(node.tileRenderer)) {
    return !!get(node, 'tileRenderer', 'onSelectCommand', 'watchEndpoint');
  }
  return (
    get(node, 'lockupViewModel', 'contentType') === 'LOCKUP_CONTENT_TYPE_VIDEO'
  );
}

function collectTiles(node: unknown, out: Json[], depth = 0) {
  if (out.length >= MAX_ITEMS || depth > 40) return;
  if (typeof node !== 'object' || node === null) return;
  if (Array.isArray(node)) {
    for (const child of node) collectTiles(child, out, depth + 1);
    return;
  }
  if (
    ('tileRenderer' in node || 'lockupViewModel' in node) &&
    isVideoTile(node as Json)
  ) {
    out.push(node as Json);
    return;
  }
  for (const key in node) collectTiles((node as Json)[key], out, depth + 1);
}

let refreshing = false;

async function refresh() {
  if (refreshing || !configRead('subscriptionsOnHome')) return;
  refreshing = true;
  try {
    const res = await innertubeFetch('/youtubei/v1/browse', {
      browseId: 'FEsubscriptions'
    });
    const items: Json[] = [];
    collectTiles(res, items);
    if (items.length) writeCache({ at: Date.now(), items });
  } catch (err) {
    logger.warn('could not load subscriptions:', err);
  } finally {
    refreshing = false;
  }
}

function isHome() {
  const path = location.hash.replace(/^#/, '');
  return path === '' || path === '/' || path.indexOf('/?') === 0;
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

addParseHandler('home-subscriptions', (res) => {
  if (refreshing || !configRead('subscriptionsOnHome') || !isHome()) return;

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

  const cache = readCache();
  if (!cache || Date.now() - cache.at > REFRESH_MS) void refresh();
  if (!cache || !cache.items.length) return;

  // Copy an existing row so the layout matches what YouTube expects.
  let template: Json | null = null;
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
      template = section as Json;
      break;
    }
  }
  if (!template) return;

  const shelf = JSON.parse(JSON.stringify(template)) as Json;
  const list = get(
    shelf,
    'shelfRenderer',
    'content',
    'horizontalListRenderer'
  ) as Json;
  list.items = JSON.parse(JSON.stringify(cache.items)) as Json[];
  delete list.continuations;
  setTitle(
    shelf.shelfRenderer,
    t('ui.homeSubscriptions', 'New from your subscriptions')
  );
  contents.unshift(shelf);
});

setTimeout(() => void refresh(), 8000);
setInterval(() => void refresh(), REFRESH_MS);

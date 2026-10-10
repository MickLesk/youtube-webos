/**
 * Filters and rewrites video tiles in browse, search and "up next" responses:
 * Shorts removal, hiding watched videos, blocked channels and DeArrow.
 */
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';
import { getPlayerManager, PlayerMode } from './player_api';
import { setCurrentChannelProvider } from './ui';

type Json = Record<string, unknown>;

const SHELF_SHORTS = 'TVHTML5_SHELF_RENDERER_TYPE_SHORTS';
const WATCHED_THRESHOLD = 90;
const DEARROW_API = 'https://sponsor.ajay.app/api/branding';
const DEARROW_THUMB_API = 'https://dearrow-thumb.ajay.app/api/v1/getThumbnail';

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Safe nested property access: get(obj, 'a', 0, 'b'). */
function get(value: unknown, ...path: (string | number)[]): unknown {
  let cur = value;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isObject(value)) return null;
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.runs)) {
    return value.runs.map((run) => (isObject(run) ? run.text : '')).join('');
  }
  return null;
}

function isShorts(item: Json) {
  if (get(item, 'shelfRenderer', 'tvhtml5ShelfRendererType') === SHELF_SHORTS)
    return true;
  if (get(item, 'tileRenderer', 'onSelectCommand', 'reelWatchEndpoint'))
    return true;
  return (
    get(item, 'lockupViewModel', 'contentType') === 'LOCKUP_CONTENT_TYPE_SHORT'
  );
}

function watchedPercent(item: Json): number {
  const overlays = get(
    item,
    'tileRenderer',
    'header',
    'tileHeaderRenderer',
    'thumbnailOverlays'
  );
  if (Array.isArray(overlays)) {
    for (const overlay of overlays) {
      const pct = get(
        overlay,
        'thumbnailOverlayResumePlaybackRenderer',
        'percentDurationWatched'
      );
      if (typeof pct === 'number') return pct;
    }
  }

  const lockupOverlays = get(
    item,
    'lockupViewModel',
    'contentImage',
    'thumbnailViewModel',
    'overlays'
  );
  if (Array.isArray(lockupOverlays)) {
    for (const overlay of lockupOverlays) {
      const pct = get(
        overlay,
        'thumbnailBottomOverlayViewModel',
        'progressBar',
        'thumbnailOverlayProgressBarViewModel',
        'startPercent'
      );
      if (typeof pct === 'number') return pct;
    }
  }

  return 0;
}

function channelOf(item: Json): string | null {
  const tileLine = get(
    item,
    'tileRenderer',
    'metadata',
    'tileMetadataRenderer',
    'lines',
    0,
    'lineRenderer',
    'items',
    0,
    'lineItemRenderer',
    'text'
  );
  const lockupLine = get(
    item,
    'lockupViewModel',
    'metadata',
    'lockupMetadataViewModel',
    'metadata',
    'contentMetadataViewModel',
    'metadataRows',
    0,
    'metadataParts',
    0,
    'text'
  );
  return textOf(tileLine ?? lockupLine)?.trim() || null;
}

function isSubscriptionsPage() {
  return location.hash.includes('FEsubscriptions');
}

function isHistoryPage() {
  return location.hash.includes('FEhistory');
}

/** Sign-in reminders and Premium upsells mixed into feeds. */
const NAG_RENDERERS = [
  'feedNudgeRenderer',
  'alertWithActionsRenderer',
  'mealbarPromoRenderer',
  'statementBannerRenderer',
  'brandVideoSingletonRenderer'
];

const LIVE_PATTERN = /"(?:style|badgeStyle)":"[A-Z_]*LIVE[A-Z_]*"/;
const UPCOMING_PATTERN = /"(?:style|badgeStyle)":"[A-Z_]*UPCOMING[A-Z_]*"/;
const MEMBERS_PATTERN = /MEMBERS_ONLY/;

/** JSON of the thumbnail area of a tile, where LIVE/UPCOMING badges sit. */
function badgeJson(item: Json): string {
  const area =
    get(item, 'tileRenderer', 'header') ??
    get(item, 'lockupViewModel', 'contentImage');
  try {
    return area ? JSON.stringify(area) : '';
  } catch {
    return '';
  }
}

function itemJson(item: Json): string {
  try {
    return JSON.stringify(item);
  } catch {
    return '';
  }
}

function titleOf(item: Json): string | null {
  return textOf(
    get(item, 'tileRenderer', 'metadata', 'tileMetadataRenderer', 'title') ??
      get(
        item,
        'lockupViewModel',
        'metadata',
        'lockupMetadataViewModel',
        'title'
      )
  );
}

/** Finds the first text-like `title` in an object, skipping its content. */
function findTitle(node: unknown, depth = 0): string | null {
  if (!isObject(node) || depth > 4) return null;
  const own = textOf(node.title);
  if (own) return own;
  for (const key of Object.keys(node)) {
    if (key === 'content' || key === 'contents' || key === 'items') continue;
    const found = findTitle(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function shelfTitleOf(item: Json): string | null {
  return findTitle(item.shelfRenderer);
}

const DURATION_PATTERN =
  /"(?:simpleText|text|content)":"(\d{1,2}(?::\d{2}){1,2})"/;

/** Video length in seconds from the duration badge, or `null`. */
function durationOf(item: Json): number | null {
  const match = DURATION_PATTERN.exec(badgeJson(item));
  if (!match) return null;
  return match[1]!
    .split(':')
    .reduce((total, part) => total * 60 + Number(part), 0);
}

function matchesAny(text: string | null, needles: string[]) {
  if (!text || !needles.length) return false;
  const lower = text.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

interface Filters {
  noPreviews: boolean;
  keywords: string[];
  shelves: string[];
  minLength: number;
  shorts: boolean;
  watched: boolean;
  channels: string[];
  nags: boolean;
  live: boolean;
  upcoming: boolean;
  members: boolean;
}

function shouldRemove(item: unknown, filters: Filters): boolean {
  if (!isObject(item)) return false;
  if (filters.nags && NAG_RENDERERS.some((key) => key in item)) return true;
  if (!('tileRenderer' in item) && !('lockupViewModel' in item)) {
    if (!('shelfRenderer' in item)) return false;
    if (filters.shorts && isShorts(item)) return true;
    return matchesAny(shelfTitleOf(item), filters.shelves);
  }

  if (matchesAny(titleOf(item), filters.keywords)) return true;
  if (filters.minLength) {
    const duration = durationOf(item);
    if (duration !== null && duration < filters.minLength) return true;
  }

  if (filters.shorts && isShorts(item)) return true;
  if (filters.watched && watchedPercent(item) >= WATCHED_THRESHOLD) return true;
  if (filters.channels.length) {
    const channel = channelOf(item);
    if (channel && filters.channels.includes(channel)) return true;
  }
  if (filters.live || filters.upcoming) {
    const badges = badgeJson(item);
    if (filters.live && LIVE_PATTERN.test(badges)) return true;
    if (filters.upcoming && UPCOMING_PATTERN.test(badges)) return true;
  }
  if (filters.members && MEMBERS_PATTERN.test(itemJson(item))) return true;
  return false;
}

/* ----------------------------- DeArrow ----------------------------- */

interface Branding {
  title: string | null;
  thumbnailTime: number | null;
}

const brandingCache = new Map<string, Branding | Promise<Branding | null>>();

async function fetchBranding(videoId: string): Promise<Branding | null> {
  try {
    const resp = await fetch(
      `${DEARROW_API}?videoID=${encodeURIComponent(videoId)}`
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as unknown;

    const titles = get(data, 'titles');
    const thumbs = get(data, 'thumbnails');

    const title = Array.isArray(titles)
      ? titles.find(
          (t) =>
            isObject(t) &&
            !t.original &&
            typeof t.title === 'string' &&
            ((t.votes as number) >= 0 || t.locked)
        )
      : undefined;
    const thumb = Array.isArray(thumbs)
      ? thumbs.find(
          (t) =>
            isObject(t) &&
            !t.original &&
            typeof t.timestamp === 'number' &&
            ((t.votes as number) >= 0 || t.locked)
        )
      : undefined;

    return {
      // A leading ">" tells DeArrow clients not to auto-format the title.
      title: title ? (title.title as string).replace(/^>/, '') : null,
      thumbnailTime: thumb ? (thumb.timestamp as number) : null
    };
  } catch (err) {
    console.debug('[DeArrow] request failed for', videoId, err);
    return null;
  }
}

function videoIdOf(item: Json): string | null {
  const id =
    get(item, 'tileRenderer', 'contentId') ??
    get(item, 'tileRenderer', 'onSelectCommand', 'watchEndpoint', 'videoId') ??
    (get(item, 'lockupViewModel', 'contentType') === 'LOCKUP_CONTENT_TYPE_VIDEO'
      ? get(item, 'lockupViewModel', 'contentId')
      : undefined);
  return typeof id === 'string' ? id : null;
}

function applyBranding(item: Json, videoId: string, branding: Branding) {
  if (branding.title) {
    const tileTitle = get(
      item,
      'tileRenderer',
      'metadata',
      'tileMetadataRenderer',
      'title'
    );
    const lockupTitle = get(
      item,
      'lockupViewModel',
      'metadata',
      'lockupMetadataViewModel',
      'title'
    );
    if (isObject(tileTitle)) {
      tileTitle.simpleText = branding.title;
      delete tileTitle.runs;
    } else if (isObject(lockupTitle)) {
      lockupTitle.content = branding.title;
    }
  }

  if (
    branding.thumbnailTime !== null &&
    configRead('enableDeArrowThumbnails')
  ) {
    const url = `${DEARROW_THUMB_API}?videoID=${encodeURIComponent(videoId)}&time=${branding.thumbnailTime}`;
    const thumbs = [{ url, width: 1280, height: 720 }];
    const tileThumb = get(
      item,
      'tileRenderer',
      'header',
      'tileHeaderRenderer',
      'thumbnail'
    );
    const lockupImage = get(
      item,
      'lockupViewModel',
      'contentImage',
      'thumbnailViewModel',
      'image'
    );
    if (isObject(tileThumb)) tileThumb.thumbnails = thumbs;
    else if (isObject(lockupImage)) lockupImage.sources = thumbs;
  }
}

function deArrow(item: Json) {
  const videoId = videoIdOf(item);
  if (!videoId) return;

  const cached = brandingCache.get(videoId);
  if (cached && !(cached instanceof Promise)) {
    // Known already: rewrite before YouTube renders the tile.
    applyBranding(item, videoId, cached);
    return;
  }

  // Unknown: fetch now and patch the object in place once it arrives. Tiles
  // that are already rendered keep the old title until they are re-rendered.
  const pending = cached ?? fetchBranding(videoId);
  if (!cached) brandingCache.set(videoId, pending);

  void pending.then((branding) => {
    if (!branding) {
      brandingCache.set(videoId, { title: null, thumbnailTime: null });
      return;
    }
    brandingCache.set(videoId, branding);
    applyBranding(item, videoId, branding);
  });
}

/* ------------------------------ Walker ------------------------------ */

/** Drop the command that starts an inline preview when a tile is focused. */
function removePreview(item: Json) {
  const tile = get(item, 'tileRenderer');
  if (
    isObject(tile) &&
    get(tile, 'onFocusCommand', 'startInlinePlaybackCommand')
  ) {
    delete tile.onFocusCommand;
  }

  const context = get(
    item,
    'lockupViewModel',
    'rendererContext',
    'commandContext'
  );
  if (
    isObject(context) &&
    JSON.stringify(context.onFocus ?? '').includes('startInlinePlaybackCommand')
  ) {
    delete context.onFocus;
  }
}

function walk(node: unknown, filters: Filters, dearrow: boolean, depth = 0) {
  if (depth > 64 || typeof node !== 'object' || node === null) return;

  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      if (shouldRemove(node[i], filters)) node.splice(i, 1);
    }
    for (const child of node) walk(child, filters, dearrow, depth + 1);
    return;
  }

  if ('tileRenderer' in node || 'lockupViewModel' in node) {
    if (dearrow) deArrow(node as Json);
    if (filters.noPreviews) removePreview(node as Json);
  }

  for (const key in node) {
    walk((node as Json)[key], filters, dearrow, depth + 1);
  }
}

function looksLikeFeed(res: Json) {
  return (
    'contents' in res ||
    'continuationContents' in res ||
    'onResponseReceivedActions' in res ||
    'entries' in res
  );
}

addParseHandler('feed-filters', (res) => {
  if (!looksLikeFeed(res)) return;

  const lowerList = (key: string) =>
    (configRead(key) as string[]).map((s) => s.toLowerCase());

  const filters: Filters = {
    noPreviews: configRead('disablePreviews'),
    keywords: lowerList('blockedKeywords'),
    shelves: lowerList('hiddenShelves'),
    minLength: (Number(configRead('minVideoLength')) || 0) * 60,
    shorts: configRead('removeShorts'),
    watched: configRead('hideWatchedVideos') && !isHistoryPage(),
    channels: configRead('blockedChannels'),
    nags: configRead('hideNags'),
    live: configRead('hideLiveStreams'),
    upcoming: configRead('hideUpcoming'),
    members: configRead('hideMembersOnly')
  };
  const dearrow = configRead('enableDeArrow');

  // Subscriptions only show what is new: no Shorts, nothing already watched.
  if (configRead('cleanSubscriptions') && isSubscriptionsPage()) {
    filters.shorts = true;
    filters.watched = true;
  }

  const anyFilter =
    filters.noPreviews ||
    filters.keywords.length > 0 ||
    filters.shelves.length > 0 ||
    filters.minLength > 0 ||
    filters.shorts ||
    filters.watched ||
    filters.channels.length > 0 ||
    filters.nags ||
    filters.live ||
    filters.upcoming ||
    filters.members;
  if (!anyFilter && !dearrow) return;

  walk(res, filters, dearrow);
});

/** Remove the suggested videos below the player on the watch page. */
addParseHandler('watch-recommendations', (res) => {
  if (!configRead('hideWatchRecommendations')) return;

  const pivot = get(
    res,
    'contents',
    'singleColumnWatchNextResults',
    'pivot',
    'sectionListRenderer'
  );
  if (!isObject(pivot) || !Array.isArray(pivot.contents)) return;

  // An empty object instead of an empty list keeps the layout intact.
  pivot.contents = [{}];
  pivot.continuations = [];
});

// Lets the options panel offer "Block channel" for the video being watched.
void getPlayerManager().then((playerManager) => {
  setCurrentChannelProvider(() => {
    if (!document.body.classList.contains('WEB_PAGE_TYPE_WATCH')) return null;
    if (playerManager.playerMode !== PlayerMode.NORMAL) return null;
    return playerManager.player.getVideoData().author?.trim() || null;
  });
});

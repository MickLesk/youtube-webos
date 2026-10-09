/**
 * Filters and rewrites video tiles in browse, search and "up next" responses:
 * Shorts removal, hiding watched videos, blocked channels and DeArrow.
 */
import { configRead } from './config';

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

function isHistoryPage() {
  return location.hash.includes('FEhistory');
}

interface Filters {
  shorts: boolean;
  watched: boolean;
  channels: string[];
}

function shouldRemove(item: unknown, filters: Filters): boolean {
  if (!isObject(item)) return false;
  if (!('tileRenderer' in item) && !('lockupViewModel' in item)) {
    return filters.shorts && 'shelfRenderer' in item && isShorts(item);
  }

  if (filters.shorts && isShorts(item)) return true;
  if (filters.watched && watchedPercent(item) >= WATCHED_THRESHOLD) return true;
  if (filters.channels.length) {
    const channel = channelOf(item);
    if (channel && filters.channels.includes(channel)) return true;
  }
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

function walk(node: unknown, filters: Filters, dearrow: boolean, depth = 0) {
  if (depth > 64 || typeof node !== 'object' || node === null) return;

  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      if (shouldRemove(node[i], filters)) node.splice(i, 1);
    }
    for (const child of node) walk(child, filters, dearrow, depth + 1);
    return;
  }

  if (dearrow && ('tileRenderer' in node || 'lockupViewModel' in node)) {
    deArrow(node as Json);
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

const originalParse = JSON.parse;

JSON.parse = function parse(
  text: string,
  reviver?: Parameters<typeof originalParse>[1]
) {
  const res = originalParse(text, reviver) as unknown;
  if (!isObject(res) || !looksLikeFeed(res)) return res;

  const filters: Filters = {
    shorts: configRead('removeShorts'),
    watched: configRead('hideWatchedVideos') && !isHistoryPage(),
    channels: configRead('blockedChannels')
  };
  const dearrow = configRead('enableDeArrow');

  if (
    !filters.shorts &&
    !filters.watched &&
    !filters.channels.length &&
    !dearrow
  )
    return res;

  try {
    walk(res, filters, dearrow);
  } catch (err) {
    console.error('[feed-filters] Failed to process response:', err);
  }

  return res;
};

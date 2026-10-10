/**
 * Extends the long-press menu of video tiles: "Add to queue", and the
 * "Not interested" / "Don't recommend channel" entries YouTube moved into a
 * separate panel. Where YouTube opens that panel instead of a menu, a menu
 * with the usual entries is built instead.
 *
 * Adapted from https://github.com/reisxd/TizenTube (mods/features/adblock.js,
 * mods/ui/ytUI.js)
 */
import { configRead, configWrite } from './config';
import { addWalkPass } from './hooks/response-walker';
import { t } from './i18n';
import {
  customActionEndpoint,
  innertubeFetch,
  setCustomActionHandler
} from './innertube';
import { showNotification } from './ui';
import type { QueuedVideo } from './video-queue';

type Json = Record<string, unknown>;

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

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isObject(value)) return '';
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.runs)) {
    return value.runs.map((run) => (isObject(run) ? run.text : '')).join('');
  }
  return '';
}

function menuText(text: string) {
  return { runs: [{ text }] };
}

function serviceItem(text: string, serviceEndpoint: Json): Json {
  return {
    menuServiceItemRenderer: {
      text: menuText(text),
      serviceEndpoint,
      trackingParams: null
    }
  };
}

function navigationItem(text: string, navigationEndpoint: Json): Json {
  return {
    menuNavigationItemRenderer: {
      text: menuText(text),
      navigationEndpoint,
      trackingParams: null
    }
  };
}

/* ------------------------------ Tile data ------------------------------ */

interface TileInfo {
  videoId: string;
  title: string;
  subtitle: string;
  thumbnails: unknown;
  watchEndpoint: Json;
  /** Where YouTube keeps the long-press command of this tile. */
  holder: Json;
  holderKey: string;
}

function tileInfo(node: Json): TileInfo | null {
  const tile = node.tileRenderer;
  if (isObject(tile)) {
    if (tile.style !== 'TILE_STYLE_YTLR_DEFAULT') return null;
    const watchEndpoint = get(tile, 'onSelectCommand', 'watchEndpoint');
    if (!isObject(watchEndpoint) || typeof tile.contentId !== 'string') {
      return null;
    }
    return {
      videoId: tile.contentId,
      title: textOf(get(tile, 'metadata', 'tileMetadataRenderer', 'title')),
      subtitle: textOf(
        get(
          tile,
          'metadata',
          'tileMetadataRenderer',
          'lines',
          0,
          'lineRenderer',
          'items',
          0,
          'lineItemRenderer',
          'text'
        )
      ),
      thumbnails: get(
        tile,
        'header',
        'tileHeaderRenderer',
        'thumbnail',
        'thumbnails'
      ),
      watchEndpoint,
      holder: tile,
      holderKey: 'onLongPressCommand'
    };
  }

  const lockup = node.lockupViewModel;
  if (isObject(lockup)) {
    if (lockup.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null;
    const context = get(lockup, 'rendererContext', 'commandContext');
    const watchEndpoint = get(
      context,
      'onTap',
      'innertubeCommand',
      'watchEndpoint'
    );
    if (
      !isObject(context) ||
      !isObject(watchEndpoint) ||
      typeof lockup.contentId !== 'string'
    ) {
      return null;
    }
    const metadata = get(lockup, 'metadata', 'lockupMetadataViewModel');
    return {
      videoId: lockup.contentId,
      title: textOf(get(metadata, 'title')),
      subtitle: textOf(
        get(
          metadata,
          'metadata',
          'contentMetadataViewModel',
          'metadataRows',
          0,
          'metadataParts',
          0,
          'text'
        )
      ),
      thumbnails: get(
        lockup,
        'contentImage',
        'thumbnailViewModel',
        'image',
        'sources'
      ),
      watchEndpoint,
      holder: context,
      holderKey: 'onLongPress'
    };
  }

  return null;
}

/** The long-press command, unwrapped from `innertubeCommand` if needed. */
function longPressCommand(info: TileInfo): Json | null {
  const raw = info.holder[info.holderKey];
  if (!isObject(raw)) return null;
  const inner = raw.innertubeCommand;
  return isObject(inner) ? inner : raw;
}

function existingMenuItems(command: Json | null): unknown[] | null {
  const items = get(
    command,
    'showMenuCommand',
    'menu',
    'menuRenderer',
    'items'
  );
  return Array.isArray(items) ? items : null;
}

interface FeedbackPanel {
  panelId: string;
  params: string;
}

function feedbackPanel(command: Json | null): FeedbackPanel | null {
  const endpoint = get(command, 'showEngagementPanelEndpoint');
  const panelId = get(endpoint, 'identifier', 'tag');
  const params = get(endpoint, 'globalConfiguration', 'params');
  if (typeof panelId === 'string' && typeof params === 'string') {
    return { panelId, params };
  }
  return null;
}

/* ------------------------------ Menu items ----------------------------- */

const MARKER = 'ytafQueue';

function queueItem(info: TileInfo): Json {
  const video: QueuedVideo = {
    videoId: info.videoId,
    title: info.title,
    watchEndpoint: info.watchEndpoint
  };
  const item = serviceItem(
    t('ui.addToQueue', 'Add to queue'),
    customActionEndpoint('addToQueue', video as unknown as Json)
  );
  (item.menuServiceItemRenderer as Json)[MARKER] = true;
  return item;
}

/** The first metadata line of a video tile is its channel. */
function blockChannelItem(info: TileInfo): Json | null {
  const name = info.subtitle.trim();
  if (!name) return null;
  return serviceItem(
    t('ui.blockChannel', 'Block channel: {name}', { name }),
    customActionEndpoint('blockChannel', { name })
  );
}

function feedbackItems(panel: FeedbackPanel): Json[] {
  return [
    serviceItem(
      t('ui.notInterested', 'Not interested'),
      customActionEndpoint('feedback', { ...panel, index: 0 })
    ),
    serviceItem(
      t('ui.dontRecommendChannel', "Don't recommend channel"),
      customActionEndpoint('feedback', { ...panel, index: 1 })
    )
  ];
}

function hasFeedbackItems(items: unknown[]) {
  return JSON.stringify(items).indexOf('feedbackEndpoint') !== -1;
}

function buildMenu(info: TileInfo, extraItems: Json[]): Json {
  const isWatchLater = info.watchEndpoint.playlistId === 'WL';
  const watchLaterAction = isWatchLater
    ? {
        removedVideoId: info.videoId,
        action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID'
      }
    : { addedVideoId: info.videoId, action: 'ACTION_ADD_VIDEO' };

  return {
    clickTrackingParams: null,
    showMenuCommand: {
      contentId: info.videoId,
      thumbnail: { thumbnails: info.thumbnails },
      title: { simpleText: info.title },
      subtitle: { simpleText: info.subtitle },
      menu: {
        menuRenderer: {
          items: [
            navigationItem(t('ui.play', 'Play'), {
              clickTrackingParams: null,
              watchEndpoint: info.watchEndpoint
            }),
            serviceItem(
              isWatchLater
                ? t('ui.removeWatchLater', 'Remove from Watch later')
                : t('ui.saveWatchLater', 'Save to Watch later'),
              {
                clickTrackingParams: null,
                commandMetadata: {
                  webCommandMetadata: {
                    sendPost: true,
                    apiUrl: '/youtubei/v1/browse/edit_playlist'
                  }
                },
                playlistEditEndpoint: {
                  playlistId: 'WL',
                  actions: [watchLaterAction]
                }
              }
            ),
            navigationItem(t('ui.saveToPlaylist', 'Save to playlist'), {
              clickTrackingParams: null,
              addToPlaylistEndpoint: { videoId: info.videoId }
            })
          ].concat(extraItems),
          trackingParams: null,
          accessibility: {
            accessibilityData: { label: 'Video options' }
          }
        }
      }
    }
  };
}

function extendTile(node: Json) {
  const info = tileInfo(node);
  if (!info) return;

  const command = longPressCommand(info);
  const panel = feedbackPanel(command);
  const items = existingMenuItems(command);

  if (items) {
    for (const item of items) {
      if (get(item, 'menuServiceItemRenderer', MARKER)) return;
    }
    items.push(queueItem(info));
    if (panel && !hasFeedbackItems(items)) {
      for (const item of feedbackItems(panel)) items.push(item);
    }
    const block = blockChannelItem(info);
    if (block) items.push(block);
    return;
  }

  // YouTube opens a panel instead of a menu: offer a menu of our own.
  if (!info.title) return;
  const extra = [queueItem(info)].concat(panel ? feedbackItems(panel) : []);
  const block = blockChannelItem(info);
  if (block) extra.push(block);
  const menu = buildMenu(info, extra);
  info.holder[info.holderKey] =
    info.holderKey === 'onLongPress' ? { innertubeCommand: menu } : menu;
}

addWalkPass('long-press-menu', () =>
  configRead('enhancedLongPress') ? { tile: extendTile } : null
);

/* ------------------------------- Feedback ------------------------------ */

/** Finds the first feedback token in a nested command. */
function findFeedbackToken(node: unknown, depth = 0): string | null {
  if (depth > 32 || typeof node !== 'object' || node === null) return null;
  const token = (node as Json).feedbackToken;
  if (typeof token === 'string') return token;
  for (const key in node) {
    const found = findFeedbackToken((node as Json)[key], depth + 1);
    if (found) return found;
  }
  return null;
}

async function sendFeedback(panel: FeedbackPanel, index: number) {
  const res = await innertubeFetch('/youtubei/v1/get_panel', {
    panelId: panel.panelId,
    params: panel.params
  });
  const listItems = get(
    res,
    'content',
    'engagementPanelSectionListRenderer',
    'content',
    'listViewModel',
    'listItems'
  );
  const tokens: string[] = [];
  if (Array.isArray(listItems)) {
    for (const item of listItems) {
      const token = findFeedbackToken(get(item, 'listItemViewModel'));
      if (token) tokens.push(token);
    }
  }

  const token = tokens[index];
  if (!token) {
    showNotification(t('msg.feedbackFailed', 'Feedback not available'));
    return;
  }

  await innertubeFetch('/youtubei/v1/feedback', { feedbackTokens: [token] });
  showNotification(
    t('msg.feedbackSent', 'Thanks, YouTube will show fewer videos like this')
  );
}

setCustomActionHandler('feedback', (params) => {
  const panel = {
    panelId: String(params.panelId),
    params: String(params.params)
  };
  sendFeedback(panel, Number(params.index) || 0).catch((err: unknown) => {
    console.warn('[long-press-menu] feedback failed:', err);
    showNotification(t('msg.feedbackFailed', 'Feedback not available'));
  });
});

setCustomActionHandler('blockChannel', (params) => {
  const name = String(params.name);
  const blocked = configRead('blockedChannels') as string[];
  if (blocked.indexOf(name) === -1) {
    configWrite('blockedChannels', blocked.concat([name]));
  }
  showNotification(
    t('msg.channelBlocked', 'Channel blocked: {name}', { name })
  );
});

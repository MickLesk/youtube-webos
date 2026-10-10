/**
 * Collects chapter markers from YouTube responses so a color button can jump
 * to the next chapter.
 */
import { addParseHandler } from './hooks/json-parse';
import { t } from './i18n';
import { getPlayerManager } from './player_api';
import { setColorActionHandler, showNotification } from './ui';

interface Chapter {
  start: number;
  title: string;
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null;
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isObject(value)) return '';
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.runs)) {
    return value.runs.map((r) => (isObject(r) ? textOf(r.text) : '')).join('');
  }
  return '';
}

/** Walks a response and returns chapters from both known marker formats. */
function collectChapters(node: unknown, out: Chapter[], depth = 0) {
  if (!isObject(node) || depth > 40) return;

  const chapter = node.chapterRenderer;
  if (isObject(chapter) && typeof chapter.timeRangeStartMillis === 'number') {
    out.push({
      start: chapter.timeRangeStartMillis / 1000,
      title: textOf(chapter.title)
    });
  }

  const entity = node.macroMarkersListEntity;
  if (isObject(entity) && isObject(entity.markersList)) {
    const list = entity.markersList;
    const markers = list.markers;
    if (
      Array.isArray(markers) &&
      (list.markerType === undefined ||
        list.markerType === 'MARKER_TYPE_CHAPTERS')
    ) {
      for (const marker of markers) {
        if (!isObject(marker)) continue;
        const start = Number(marker.startMillis);
        if (Number.isFinite(start)) {
          out.push({ start: start / 1000, title: textOf(marker.title) });
        }
      }
    }
  }

  for (const key of Object.keys(node)) {
    collectChapters(node[key], out, depth + 1);
  }
}

function videoIdOf(res: Json): string | null {
  const endpoint = res.currentVideoEndpoint;
  const fromEndpoint =
    isObject(endpoint) && isObject(endpoint.watchEndpoint)
      ? endpoint.watchEndpoint.videoId
      : undefined;
  const details = res.videoDetails;
  const id = fromEndpoint ?? (isObject(details) ? details.videoId : undefined);
  return typeof id === 'string' ? id : null;
}

const chaptersByVideo = new Map<string, Chapter[]>();

addParseHandler('chapters', (res) => {
  const id = videoIdOf(res);
  if (!id) return;

  const found: Chapter[] = [];
  collectChapters(res, found);
  if (!found.length) return;

  found.sort((a, b) => a.start - b.start);
  chaptersByVideo.set(id, found);
  if (chaptersByVideo.size > 20) {
    chaptersByVideo.delete(chaptersByVideo.keys().next().value!);
  }
});

const playerManager = await getPlayerManager();

setColorActionHandler('nextChapter', () => {
  if (!document.body.classList.contains('WEB_PAGE_TYPE_WATCH')) return false;

  const id = playerManager.currentVideoID;
  const chapters = id ? chaptersByVideo.get(id) : undefined;
  const video = document.querySelector('video');
  if (!video) return false;

  const next = chapters?.find((c) => c.start > video.currentTime + 1);
  if (!next) {
    showNotification(t('msg.noChapter', 'No next chapter'), 1500);
    return true;
  }

  video.currentTime = next.start;
  showNotification(next.title || t('msg.nextChapter', 'Next chapter'), 2000);
  return true;
});

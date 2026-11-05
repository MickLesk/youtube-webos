import kindOf from 'which-builtin-type';

import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';

function isObject(value: unknown): value is object {
  // @ts-expect-error - bad types
  return kindOf(value) === 'Object';
}

/** Start of the end screen in seconds, by video id (skip-endscreen.ts). */
const endscreenStart = new Map<string, number>();

export function getEndscreenStart(videoId: string): number | undefined {
  return endscreenStart.get(videoId);
}

function recordEndscreen(res: Record<string, unknown>) {
  const details = res.videoDetails as { videoId?: unknown } | undefined;
  const renderer = (res.endscreen as Record<string, unknown> | undefined)
    ?.endscreenRenderer as { startMs?: unknown } | undefined;
  const start = Number(renderer?.startMs);
  if (typeof details?.videoId !== 'string' || !(start > 0)) return;
  endscreenStart.set(details.videoId, start / 1000);
  if (endscreenStart.size > 30) {
    endscreenStart.delete(endscreenStart.keys().next().value!);
  }
}

addParseHandler('remove-endscreen', (res) => {
  if (isObject(res.endscreen)) recordEndscreen(res);
  if (!configRead('removeEndscreen')) return;

  if (isObject(res.endscreen) && 'endscreenRenderer' in res.endscreen) {
    console.debug('Removed endscreen from JSON response', res.endscreen);
    delete res.endscreen;
  }
});

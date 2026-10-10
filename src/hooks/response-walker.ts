/**
 * One shared walk over feed-like YouTube responses. Features register a
 * pass instead of walking the (often large) response themselves, so each
 * response is traversed once no matter how many features are on.
 */
import { createLogger } from '../logger';
import { addParseHandler } from './json-parse';

type Json = Record<string, unknown>;

export interface WalkPass {
  /** Return `true` to drop an entry from the array it is in. */
  remove?: (item: unknown) => boolean;
  /** Called for every video/channel tile (tileRenderer or lockupViewModel). */
  tile?: (node: Json) => void;
}

/** Returns the pass for this response, or `null` if the feature is off. */
export type PassFactory = (res: Json) => WalkPass | null;

const factories: { name: string; create: PassFactory }[] = [];
const logger = createLogger('response-walker');

export function addWalkPass(name: string, create: PassFactory) {
  factories.push({ name, create });
}

const MAX_DEPTH = 64;

function looksLikeFeed(res: Json) {
  return (
    'contents' in res ||
    'continuationContents' in res ||
    'onResponseReceivedActions' in res ||
    'entries' in res
  );
}

addParseHandler('response-walker', (res) => {
  if (!looksLikeFeed(res)) return;

  const removers: ((item: unknown) => boolean)[] = [];
  const tileHandlers: { name: string; fn: (node: Json) => void }[] = [];
  for (const { name, create } of factories) {
    let pass: WalkPass | null = null;
    try {
      pass = create(res);
    } catch (err) {
      logger.error(`pass "${name}" failed to start:`, err);
    }
    if (!pass) continue;
    if (pass.remove) removers.push(pass.remove);
    if (pass.tile) tileHandlers.push({ name, fn: pass.tile });
  }
  if (!removers.length && !tileHandlers.length) return;

  const shouldRemove = (item: unknown) => {
    for (const remove of removers) {
      if (remove(item)) return true;
    }
    return false;
  };

  const walk = (node: unknown, depth: number) => {
    if (depth > MAX_DEPTH || typeof node !== 'object' || node === null) return;

    if (Array.isArray(node)) {
      if (removers.length) {
        for (let i = node.length - 1; i >= 0; i--) {
          if (shouldRemove(node[i])) node.splice(i, 1);
        }
      }
      for (let i = 0; i < node.length; i++) walk(node[i], depth + 1);
      return;
    }

    if ('tileRenderer' in node || 'lockupViewModel' in node) {
      for (const handler of tileHandlers) {
        try {
          handler.fn(node as Json);
        } catch (err) {
          logger.error(`tile handler "${handler.name}" failed:`, err);
        }
      }
    }

    for (const key in node) walk((node as Json)[key], depth + 1);
  };

  walk(res, 0);
});

/**
 * Access to the TV client's internal services and API client, and a hook
 * for our own commands in long-press menus.
 *
 * Adapted from https://github.com/reisxd/TizenTube (mods/utils/innerTubeCalls.js)
 */
import { ResolveCommandRegistry } from './app_api';

type Json = Record<string, unknown>;

interface ServiceMap {
  mappings: unknown;
  get(name: string): unknown;
}

interface Observable {
  subscribe(
    next: (value: unknown) => void,
    error?: (err: unknown) => void
  ): void;
}

interface InnerTubeClient {
  fetch(request: Json): Observable;
}

function findServiceMap(): ServiceMap | null {
  const yttv = window._yttv;
  if (!yttv) return null;
  for (const key in yttv) {
    const candidate = yttv[key] as ServiceMap | null;
    if (
      candidate &&
      candidate.mappings &&
      typeof candidate.get === 'function'
    ) {
      return candidate;
    }
  }
  return null;
}

/** An internal service of the TV client, e.g. "PlayerService". */
export function getService<T>(name: string): T | null {
  const map = findServiceMap();
  if (!map) return null;
  try {
    return (map.get(name) as T | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Calls the YouTube API through the TV client, which adds auth itself. */
export function innertubeFetch(path: string, payload?: Json): Promise<Json> {
  const client = getService<InnerTubeClient>('KabukiInnerTubeClient');
  if (!client) return Promise.reject(new Error('API client not found'));

  return new Promise((resolve, reject) => {
    client
      .fetch(payload ? { path, payload } : { path })
      .subscribe((res) => resolve((res ?? {}) as Json), reject);
  });
}

/** Run a YouTube command, e.g. `{ watchEndpoint: { videoId } }`. */
export async function dispatchCommand(command: Json) {
  const registry = await ResolveCommandRegistry.getInstance();
  return registry.dispatchCommand(command);
}

/* ---------------------------- Custom actions ---------------------------- */

export type CustomActionHandler = (params: Json) => void;

const ACTION_KEY = 'ytafAction';
const actionHandlers = new Map<string, CustomActionHandler>();

export function setCustomActionHandler(
  action: string,
  handler: CustomActionHandler
) {
  actionHandlers.set(action, handler);
}

/**
 * A service endpoint that runs one of our actions when selected. It is
 * wrapped in a playlistEditEndpoint because menus only accept endpoints
 * YouTube knows.
 */
export function customActionEndpoint(action: string, params: Json): Json {
  return {
    clickTrackingParams: null,
    playlistEditEndpoint: { [ACTION_KEY]: { action, params } }
  };
}

// Registered without waiting, so modules that import this one stay
// synchronous and can rewrite the first responses.
void ResolveCommandRegistry.getInstance().then((registry) => {
  registry.setHook('playlistEditEndpoint', (resolveCommand, payload, extra) => {
    const custom = (payload.playlistEditEndpoint as Json | undefined)?.[
      ACTION_KEY
    ] as { action: string; params: Json } | undefined;
    if (!custom) return resolveCommand(payload, extra);

    const handler = actionHandlers.get(custom.action);
    if (handler) {
      try {
        handler(custom.params);
      } catch (err) {
        console.warn('[innertube] action failed:', custom.action, err);
      }
    }
    return true;
  });
});

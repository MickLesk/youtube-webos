/**
 * Single JSON.parse hook shared by all features that rewrite YouTube
 * responses. Each handler runs isolated: if one throws, the error is logged
 * and the remaining handlers and YouTube itself still get the response.
 */
import { createLogger } from '../logger';

export type ParseHandler = (res: Record<string, unknown>) => void;

const handlers: { name: string; fn: ParseHandler }[] = [];
const logger = createLogger('json-parse');

/**
 * Register a handler for every parsed plain object (not arrays or
 * primitives). Handlers run in registration order and may mutate `res`.
 */
export function addParseHandler(name: string, fn: ParseHandler) {
  handlers.push({ name, fn });
}

/** Time spent in our handlers, shown on the Diagnostics page. */
const stats = { responses: 0, totalMs: 0, maxMs: 0 };

export function getParseStats() {
  return stats;
}

const now = () =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();

const originalParse = JSON.parse;

JSON.parse = function parse(
  text: string,
  reviver?: Parameters<typeof originalParse>[1]
) {
  const res = originalParse(text, reviver) as unknown;

  if (typeof res !== 'object' || res === null || Array.isArray(res)) {
    return res;
  }

  const start = now();
  for (const { name, fn } of handlers) {
    try {
      fn(res as Record<string, unknown>);
    } catch (err) {
      logger.error(`handler "${name}" failed:`, err);
    }
  }
  const elapsed = now() - start;
  // Only YouTube API responses, not small JSON like our own settings.
  if (!('responseContext' in res)) return res;
  stats.responses++;
  stats.totalMs += elapsed;
  if (elapsed > stats.maxMs) stats.maxMs = elapsed;

  return res;
};

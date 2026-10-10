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

const originalParse = JSON.parse;

JSON.parse = function parse(
  text: string,
  reviver?: Parameters<typeof originalParse>[1]
) {
  const res = originalParse(text, reviver) as unknown;

  if (typeof res !== 'object' || res === null || Array.isArray(res)) {
    return res;
  }

  for (const { name, fn } of handlers) {
    try {
      fn(res as Record<string, unknown>);
    } catch (err) {
      logger.error(`handler "${name}" failed:`, err);
    }
  }

  return res;
};

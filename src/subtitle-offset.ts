/**
 * Shifts subtitles in time. YouTube loads captions as JSON ("json3") and
 * parses them with JSON.parse, so the events can be moved before the player
 * sees them. Takes effect with the next caption load.
 */
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';

interface CaptionEvent {
  tStartMs?: unknown;
  dDurationMs?: unknown;
}

addParseHandler('subtitle-offset', (res) => {
  const offset = Number(configRead('subtitleOffset')) || 0;
  if (!offset) return;
  const events = res.events;
  if (res.wireMagic !== 'pb3' || !Array.isArray(events)) return;

  for (const event of events as CaptionEvent[]) {
    if (typeof event !== 'object' || event === null) continue;
    if (typeof event.tStartMs !== 'number') continue;
    event.tStartMs = Math.max(0, event.tStartMs + offset);
  }
});

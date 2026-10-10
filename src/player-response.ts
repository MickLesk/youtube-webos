/**
 * Tweaks applied to player and "next" responses before YouTube sees them.
 */
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** Drop the "Are you still watching?" prompt. */
function removeYouThere(res: Json) {
  const messages = asArray(res.messages);
  if (!messages || !configRead('hideYouThere')) return;

  res.messages = messages.filter(
    (msg) => !(isObject(msg) && 'youThereRenderer' in msg)
  );
}

/** Keep only the original audio track when dubbed tracks are offered. */
function forceOriginalAudio(res: Json) {
  if (!configRead('forceOriginalAudio')) return;

  const streamingData = res.streamingData;
  if (!isObject(streamingData)) return;

  const formats = asArray(streamingData.adaptiveFormats);
  if (!formats) return;

  const isAudio = (f: unknown): f is Json =>
    isObject(f) &&
    typeof f.mimeType === 'string' &&
    f.mimeType.startsWith('audio/');
  const isOriginal = (f: Json) =>
    isObject(f.audioTrack) && f.audioTrack.audioIsDefault === true;

  const audio = formats.filter(isAudio);
  const hasTracks = audio.some((f) => isObject(f.audioTrack));
  if (!hasTracks || !audio.some(isOriginal)) return;

  streamingData.adaptiveFormats = formats.filter(
    (f) => !isAudio(f) || !isObject(f.audioTrack) || isOriginal(f)
  );
  console.info('[player-response] Kept only the original audio track');
}

/** Stop YouTube from switching subtitles on by itself. */
function disableAutoCaptions(res: Json) {
  if (!configRead('disableAutoCaptions')) return;

  const captions = res.captions;
  if (!isObject(captions)) return;

  const renderer = captions.playerCaptionsTracklistRenderer;
  if (!isObject(renderer)) return;

  for (const track of asArray(renderer.audioTracks) ?? []) {
    if (!isObject(track)) continue;
    delete track.defaultCaptionTrackIndex;
    track.captionsInitialState = 'CAPTIONS_INITIAL_STATE_OFF_RECOMMENDED';
  }
}

/** Remove shopping/merch QR overlays and the paid promotion banner. */
function removePromotions(res: Json) {
  if (!configRead('enableAdBlock')) return;

  if ('paidContentOverlay' in res) {
    delete res.paidContentOverlay;
  }

  const overlays = res.playerOverlays;
  if (!isObject(overlays)) return;
  const renderer = overlays.playerOverlayRenderer;
  if (!isObject(renderer)) return;

  const actions = asArray(renderer.timelyActionRenderers);
  if (!actions) return;

  renderer.timelyActionRenderers = actions.filter((action) => {
    const type = isObject(action)
      ? (action.timelyActionRenderer as Json | undefined)?.type
      : undefined;
    return type !== 'TIMELY_ACTION_TYPE_SHOPPING';
  });
}

addParseHandler('player-response', (res) => {
  removeYouThere(res);
  forceOriginalAudio(res);
  disableAutoCaptions(res);
  removePromotions(res);
});

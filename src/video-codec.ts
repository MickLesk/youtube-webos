/**
 * Video codec preference and resolution cap.
 *
 * Both work on the player response: video formats that don't match are
 * removed before YouTube picks one. For the codec preference the other
 * codecs are also reported as unsupported, so the player doesn't fall back
 * to them on its own.
 */
import { getChannelSettings } from './channel-settings';
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';

type Codec = 'vp9' | 'avc' | 'av1';

const CODEC_PATTERNS: Record<Codec, RegExp> = {
  vp9: /vp0?9/,
  avc: /avc1/,
  av1: /av01/
};

interface StreamingFormat {
  mimeType?: string;
  height?: number;
  [key: string]: unknown;
}

function preferredCodec(): Codec | null {
  const value = configRead('videoCodec');
  return value === 'vp9' || value === 'avc' || value === 'av1' ? value : null;
}

function maxHeight(channel: string | null): number | null {
  const own = getChannelSettings(channel).maxResolution;
  const value = own ?? Number(configRead('maxResolution'));
  return value > 0 ? value : null;
}

function codecOf(mimeType: string | undefined): Codec | null {
  if (!mimeType) return null;
  for (const codec of Object.keys(CODEC_PATTERNS) as Codec[]) {
    if (CODEC_PATTERNS[codec].test(mimeType)) return codec;
  }
  return null;
}

function isVideo(format: unknown): format is StreamingFormat {
  return (
    typeof format === 'object' &&
    format !== null &&
    typeof (format as StreamingFormat).mimeType === 'string' &&
    (format as StreamingFormat).mimeType!.startsWith('video/')
  );
}

/**
 * Keep only the video formats matching `keep`, unless that would leave no
 * video format at all.
 */
function filterVideo(
  formats: unknown[],
  keep: (format: StreamingFormat) => boolean
): unknown[] {
  const videos = formats.filter(isVideo);
  if (!videos.some(keep)) return formats;
  return formats.filter((f) => !isVideo(f) || keep(f));
}

addParseHandler('video-codec', (res) => {
  const codec = preferredCodec();
  const author = (res.videoDetails as { author?: unknown } | undefined)?.author;
  const height = maxHeight(typeof author === 'string' ? author.trim() : null);
  if (!codec && !height) return;

  const streamingData = res.streamingData as
    Record<string, unknown> | null | undefined;
  if (typeof streamingData !== 'object' || streamingData === null) return;

  for (const key of ['formats', 'adaptiveFormats']) {
    let formats = streamingData[key];
    if (!Array.isArray(formats)) continue;

    const before = formats.length;
    if (codec) {
      formats = filterVideo(
        formats as unknown[],
        (f) => codecOf(f.mimeType) === codec
      );
    }
    if (height) {
      formats = filterVideo(
        formats as unknown[],
        (f) => typeof f.height !== 'number' || f.height <= height
      );
    }
    streamingData[key] = formats;

    const removed = before - (formats as unknown[]).length;
    if (removed > 0) {
      console.info(`[video-codec] Removed ${removed} formats from ${key}`);
    }
  }
});

/** `true` if the codec preference rules this video MIME type out. */
function isExcluded(mimeType: string | undefined) {
  const codec = preferredCodec();
  if (!codec || !mimeType?.startsWith('video/')) return false;
  const actual = codecOf(mimeType);
  return actual !== null && actual !== codec;
}

const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
HTMLMediaElement.prototype.canPlayType = function (mimeType) {
  if (isExcluded(mimeType)) return '';
  return originalCanPlayType.call(this, mimeType);
};

const originalIsTypeSupported = window.MediaSource?.isTypeSupported;
if (originalIsTypeSupported) {
  window.MediaSource.isTypeSupported = function (mimeType) {
    if (isExcluded(mimeType)) return false;
    return originalIsTypeSupported.call(this, mimeType);
  };
}

const originalDecodingInfo = navigator.mediaCapabilities?.decodingInfo;
if (originalDecodingInfo) {
  navigator.mediaCapabilities.decodingInfo = function (configuration) {
    if (isExcluded(configuration.video?.contentType)) {
      return Promise.resolve({
        supported: false,
        smooth: false,
        powerEfficient: false,
        keySystemAccess: null
      } as MediaCapabilitiesDecodingInfo);
    }
    return originalDecodingInfo.call(this, configuration);
  };
}

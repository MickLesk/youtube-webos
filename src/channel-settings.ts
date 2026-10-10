/**
 * Settings remembered per channel: playback speed and SponsorBlock on/off.
 * Changed in the settings panel while a video of that channel is open.
 */
import { configRead, configWrite } from './config';

export interface ChannelSettings {
  /** Playback speed, overrides the default speed. */
  speed?: number;
  /** SponsorBlock is skipped for this channel. */
  noSponsorBlock?: boolean;
}

type ChannelMap = Record<string, ChannelSettings>;

function readAll(): ChannelMap {
  const value = configRead('channelSettings') as ChannelMap | null;
  return value && typeof value === 'object' ? value : {};
}

/** Channel of the video that is currently loaded, if known. */
export function currentChannel(): string | null {
  const player = document.querySelector('.html5-video-player') as
    (HTMLElement & { getVideoData?: () => { author?: string } }) | null;
  try {
    return player?.getVideoData?.().author?.trim() || null;
  } catch {
    return null;
  }
}

export function getChannelSettings(channel: string | null): ChannelSettings {
  if (!channel) return {};
  return readAll()[channel] ?? {};
}

/** Change one setting; `undefined` removes it. */
export function setChannelSetting<K extends keyof ChannelSettings>(
  channel: string,
  key: K,
  value: ChannelSettings[K] | undefined
) {
  const all: ChannelMap = {};
  const current = readAll();
  for (const name of Object.keys(current)) all[name] = { ...current[name] };

  const entry: ChannelSettings = all[channel] ?? {};
  if (value === undefined) delete entry[key];
  else entry[key] = value;

  if (Object.keys(entry).length) all[channel] = entry;
  else delete all[channel];
  configWrite('channelSettings', all);
}

export function getChannelsWithSettings(): string[] {
  return Object.keys(readAll()).sort();
}

export function removeChannelSettings(channel: string) {
  const all = { ...readAll() };
  delete all[channel];
  configWrite('channelSettings', all);
}

/** Speed for the current video's channel, or `null` to use the default. */
export function currentChannelSpeed(): number | null {
  const speed = getChannelSettings(currentChannel()).speed;
  return typeof speed === 'number' && speed > 0 ? speed : null;
}

export function sponsorBlockOffForCurrentChannel(): boolean {
  return !!getChannelSettings(currentChannel()).noSponsorBlock;
}

import 'whatwg-fetch';
import './domrect-polyfill';
import { reportStartupError } from './startup-errors';
import './font-fix.css';
import './yt-fixes.css';

import { handleLaunch } from './utils';

document.addEventListener(
  'webOSRelaunch',
  (evt) => {
    console.info('RELAUNCH:', evt, window.launchParams);
    handleLaunch(evt.detail);
  },
  true
);

/**
 * Every feature is loaded on its own: one that fails to start is reported on
 * screen and in Diagnostics, and the others (above all the settings panel and
 * the color buttons in ui.js) still work. The order matches the former static
 * imports; eager imports stay in this bundle and run in this order.
 */
const FEATURES: [string, () => Promise<unknown>][] = [
  ['video-codec', () => import(/* webpackMode: "eager" */ './video-codec')],
  ['app_api/index', () => import(/* webpackMode: "eager" */ './app_api/index')],
  ['adblock.js', () => import(/* webpackMode: "eager" */ './adblock.js')],
  [
    'hooks/json-stringify',
    () => import(/* webpackMode: "eager" */ './hooks/json-stringify')
  ],
  ['feed-filters', () => import(/* webpackMode: "eager" */ './feed-filters')],
  [
    'long-press-menu',
    () => import(/* webpackMode: "eager" */ './long-press-menu')
  ],
  [
    'home-subscriptions',
    () => import(/* webpackMode: "eager" */ './home-subscriptions')
  ],
  [
    'yt-settings-entry',
    () => import(/* webpackMode: "eager" */ './yt-settings-entry')
  ],
  [
    'player-response',
    () => import(/* webpackMode: "eager" */ './player-response')
  ],
  [
    'sponsorblock.js',
    () => import(/* webpackMode: "eager" */ './sponsorblock.js')
  ],
  ['ui.js', () => import(/* webpackMode: "eager" */ './ui.js')],
  [
    'thumbnail-quality',
    () => import(/* webpackMode: "eager" */ './thumbnail-quality')
  ],
  [
    'screensaver-fix',
    () => import(/* webpackMode: "eager" */ './screensaver-fix')
  ],
  ['watch.js', () => import(/* webpackMode: "eager" */ './watch.js')],
  ['video-quality', () => import(/* webpackMode: "eager" */ './video-quality')],
  [
    'lang-settings-fix',
    () => import(/* webpackMode: "eager" */ './lang-settings-fix')
  ],
  [
    'remove-endscreen',
    () => import(/* webpackMode: "eager" */ './remove-endscreen')
  ],
  ['hooks', () => import(/* webpackMode: "eager" */ './hooks')],
  [
    'block-webos-cast',
    () => import(/* webpackMode: "eager" */ './block-webos-cast')
  ],
  [
    'auto-account-select',
    () => import(/* webpackMode: "eager" */ './auto-account-select')
  ],
  ['live-catchup', () => import(/* webpackMode: "eager" */ './live-catchup')],
  ['mute-previews', () => import(/* webpackMode: "eager" */ './mute-previews')],
  [
    'playback-speed',
    () => import(/* webpackMode: "eager" */ './playback-speed')
  ],
  [
    'return-dislike',
    () => import(/* webpackMode: "eager" */ './return-dislike')
  ],
  [
    'time-remaining',
    () => import(/* webpackMode: "eager" */ './time-remaining')
  ],
  ['sleep-timer', () => import(/* webpackMode: "eager" */ './sleep-timer')],
  ['start-page', () => import(/* webpackMode: "eager" */ './start-page')],
  ['seek-step', () => import(/* webpackMode: "eager" */ './seek-step')],
  [
    'playback-stats',
    () => import(/* webpackMode: "eager" */ './playback-stats')
  ],
  ['chapters', () => import(/* webpackMode: "eager" */ './chapters')],
  ['scroll-seek', () => import(/* webpackMode: "eager" */ './scroll-seek')],
  [
    'sort-subscriptions',
    () => import(/* webpackMode: "eager" */ './sort-subscriptions')
  ],
  ['whats-new', () => import(/* webpackMode: "eager" */ './whats-new')],
  ['appearance', () => import(/* webpackMode: "eager" */ './appearance')],
  ['video-queue', () => import(/* webpackMode: "eager" */ './video-queue')],
  [
    'picture-in-picture',
    () => import(/* webpackMode: "eager" */ './picture-in-picture')
  ],
  ['live-chat', () => import(/* webpackMode: "eager" */ './live-chat')],
  [
    'resume-position',
    () => import(/* webpackMode: "eager" */ './resume-position')
  ],
  ['number-keys', () => import(/* webpackMode: "eager" */ './number-keys')],
  ['quick-menu', () => import(/* webpackMode: "eager" */ './quick-menu')],
  ['emoji', () => import(/* webpackMode: "eager" */ './emoji')],
  [
    'subtitle-style',
    () => import(/* webpackMode: "eager" */ './subtitle-style')
  ],
  ['self-test', () => import(/* webpackMode: "eager" */ './self-test')],
  ['update-check', () => import(/* webpackMode: "eager" */ './update-check')],
  [
    'account-profiles',
    () => import(/* webpackMode: "eager" */ './account-profiles')
  ]
];

for (const [name, load] of FEATURES) {
  load().catch((err: unknown) => reportStartupError(name, err));
}

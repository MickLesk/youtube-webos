const CONFIG_KEY = 'ytaf-configuration';

// Category options used to be booleans (true = skip). Keep stored values working.
const migrateSponsorBlockMode = (value) =>
  value === true ? 'skip' : value === false ? 'show' : value;

const SPONSORBLOCK_MODES = [
  { value: 'skip', label: 'Skip' },
  { value: 'manual', label: 'Ask' },
  { value: 'show', label: 'Show only' },
  { value: 'off', label: 'Off' }
];

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => ({
  value,
  label: `${value}x`
}));

/**
 * Option shapes:
 * - boolean options: `{ default: boolean, desc }`
 * - choice options: `{ default, desc, choices: { value, label }[] }`
 * - data options (not shown as a control): `{ default, desc }`
 */
const BUTTON_ACTIONS = [
  { value: 'none', label: 'YouTube default' },
  { value: 'speed', label: 'Cycle playback speed' },
  { value: 'sponsorblock', label: 'SponsorBlock skip/highlight' },
  { value: 'audioOnly', label: 'Audio-only mode' },
  { value: 'nextChapter', label: 'Next chapter' },
  { value: 'stats', label: 'Toggle playback statistics' },
  { value: 'pip', label: 'Picture-in-picture' },
  { value: 'queueNext', label: 'Play next in queue' },
  { value: 'liveChat', label: 'Show/hide live chat' },
  { value: 'quickMenu', label: 'Quick menu' },
  { value: 'zoom', label: 'Zoom video' },
  { value: 'phoneQr', label: 'Continue on phone (QR code)' },
  { value: 'bookmark', label: 'Set bookmark' },
  { value: 'nextBookmark', label: 'Jump to next bookmark' }
];

const LANGUAGE_CHOICES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'tr', label: 'Türkçe' }
];

const configOptions = new Map([
  [
    'language',
    {
      default: 'auto',
      desc: 'Language',
      choices: [
        { value: 'auto', label: 'Automatic' },
        { value: 'en', label: 'English' },
        { value: 'de', label: 'Deutsch' }
      ]
    }
  ],
  ['enableAdBlock', { default: true, desc: 'Enable ad blocking' }],
  ['upgradeThumbnails', { default: false, desc: 'Upgrade thumbnail quality' }],
  ['removeShorts', { default: false, desc: 'Remove Shorts everywhere' }],
  ['hideLiveStreams', { default: false, desc: 'Hide live streams' }],
  ['hideUpcoming', { default: false, desc: 'Hide upcoming premieres' }],
  ['hideMembersOnly', { default: false, desc: 'Hide members-only videos' }],
  ['hideMixes', { default: false, desc: 'Hide mixes and radio playlists' }],
  [
    'hideOlderThan',
    {
      default: 'off',
      desc: 'Hide old videos',
      choices: [
        { value: 'off', label: 'Off' },
        { value: '30', label: 'Older than 1 month' },
        { value: '180', label: 'Older than 6 months' },
        { value: '365', label: 'Older than 1 year' }
      ]
    }
  ],
  ['hideDuplicates', { default: false, desc: 'Hide repeated videos' }],
  [
    'tileRemainingTime',
    { default: false, desc: 'Remaining time on started videos' }
  ],
  [
    'newSubscriptionsNotice',
    { default: false, desc: 'New subscription videos at start' }
  ],
  [
    'breakReminder',
    {
      default: 'off',
      desc: 'Break reminder',
      choices: [
        { value: 'off', label: 'Off' },
        { value: '60', label: 'After 60 minutes' },
        { value: '90', label: 'After 90 minutes' },
        { value: '120', label: 'After 2 hours' },
        { value: '180', label: 'After 3 hours' }
      ]
    }
  ],
  [
    'dailyLimit',
    {
      default: 'off',
      desc: 'Daily limit',
      choices: [
        { value: 'off', label: 'Off' },
        { value: '1', label: '1 hour' },
        { value: '2', label: '2 hours' },
        { value: '3', label: '3 hours' },
        { value: '4', label: '4 hours' },
        { value: '6', label: '6 hours' }
      ]
    }
  ],
  ['numberKeyPages', { default: false, desc: 'Number keys open pages' }],
  ['longBackHome', { default: false, desc: 'Hold Back to go Home' }],
  [
    'continueWatchingRow',
    { default: true, desc: '"Continue watching" row on Home' }
  ],
  ['trackScreenTime', { default: true, desc: 'Record screen time' }],
  [
    'hideLowRated',
    {
      default: 'off',
      desc: 'Hide poorly rated videos',
      choices: [
        { value: 'off', label: 'Off' },
        { value: '70', label: 'Below 70% likes' },
        { value: '80', label: 'Below 80% likes' },
        { value: '90', label: 'Below 90% likes' }
      ]
    }
  ],
  [
    'hideWatchedVideos',
    { default: false, desc: 'Hide watched videos in feeds' }
  ],
  [
    'blockedChannels',
    { default: [], desc: 'Channels hidden from feeds and search' }
  ],
  [
    'blockedKeywords',
    { default: [], desc: 'Hide videos whose title contains' }
  ],
  ['hiddenShelves', { default: [], desc: 'Hide shelves whose title contains' }],
  ['channelSettings', { default: {}, desc: 'Per-channel settings' }],
  [
    'minVideoLength',
    {
      default: 0,
      desc: 'Minimum video length',
      choices: [0, 1, 2, 3, 5, 10, 20].map((value) => ({
        value,
        label: value ? `${value} min` : 'Off'
      }))
    }
  ],
  [
    'hideWatchRecommendations',
    { default: false, desc: 'Hide recommendations below the player' }
  ],
  [
    'enableDeArrow',
    { default: false, desc: 'DeArrow: replace clickbait titles' }
  ],
  [
    'enableDeArrowThumbnails',
    { default: false, desc: 'DeArrow: replace clickbait thumbnails' }
  ],
  ['enableSponsorBlock', { default: true, desc: 'Enable SponsorBlock' }],
  [
    'enableSponsorBlockSponsor',
    {
      default: 'skip',
      desc: 'Sponsor',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockIntro',
    {
      default: 'skip',
      desc: 'Intro',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockOutro',
    {
      default: 'skip',
      desc: 'Outro',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockInteraction',
    {
      default: 'skip',
      desc: 'Interaction reminder',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockSelfPromo',
    {
      default: 'skip',
      desc: 'Self promotion',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockMusicOfftopic',
    {
      default: 'skip',
      desc: 'Non-music part in music videos',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockPreview',
    {
      default: 'show',
      desc: 'Recap and preview',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockFiller',
    {
      default: 'show',
      desc: 'Filler tangent',
      choices: SPONSORBLOCK_MODES,
      migrate: migrateSponsorBlockMode
    }
  ],
  [
    'enableSponsorBlockHighlight',
    { default: true, desc: 'Offer jump to highlight' }
  ],
  [
    'sponsorBlockMinLength',
    {
      default: 0,
      desc: 'Ignore segments shorter than',
      choices: [0, 1, 3, 5, 10].map((value) => ({
        value,
        label: value ? `${value} s` : 'Off'
      }))
    }
  ],
  [
    'sponsorBlockSkipOnce',
    { default: true, desc: 'Skip each segment only once' }
  ],
  [
    'enableSponsorBlockNotifications',
    { default: true, desc: 'Show skip notifications' }
  ],
  [
    'defaultPlaybackSpeed',
    {
      default: 1,
      desc: 'Default playback speed',
      choices: PLAYBACK_SPEEDS
    }
  ],
  [
    'sleepTimer',
    {
      default: 0,
      desc: 'Sleep timer',
      choices: [0, 15, 30, 60, 90, 120].map((value) => ({
        value,
        label: value ? `${value} min` : 'Off'
      }))
    }
  ],
  [
    'showTimeRemaining',
    { default: false, desc: 'Show remaining time and end time' }
  ],
  [
    'startPage',
    {
      default: 'home',
      desc: 'Start page',
      choices: [
        { value: 'home', label: 'Home' },
        { value: 'subscriptions', label: 'Subscriptions' },
        { value: 'library', label: 'Library' },
        { value: 'history', label: 'History' }
      ]
    }
  ],
  ['hideNags', { default: true, desc: 'Hide sign-in and Premium nags' }],
  [
    'hideYouThere',
    { default: true, desc: 'Never ask "Are you still watching?"' }
  ],
  [
    'forceOriginalAudio',
    { default: false, desc: 'Prefer original audio over dubbed tracks' }
  ],
  [
    'preferredAudioLanguage',
    {
      default: 'none',
      desc: 'Preferred audio language',
      choices: [{ value: 'none', label: 'YouTube default' }].concat(
        LANGUAGE_CHOICES
      )
    }
  ],
  [
    'subtitleOffset',
    {
      default: 0,
      desc: 'Subtitle delay',
      choices: [-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000].map(
        (value) => ({
          value,
          label: value
            ? `${value > 0 ? '+' : '-'}${Math.abs(value) / 1000} s`
            : '0 s'
        })
      )
    }
  ],
  [
    'disableAutoCaptions',
    { default: false, desc: 'Do not turn on subtitles automatically' }
  ],
  [
    'subtitleLanguage',
    {
      default: 'none',
      desc: 'Subtitles',
      choices: [
        { value: 'none', label: 'YouTube default' },
        { value: 'de', label: 'Deutsch' },
        { value: 'en', label: 'English' },
        { value: 'fr', label: 'Français' },
        { value: 'es', label: 'Español' },
        { value: 'it', label: 'Italiano' },
        { value: 'nl', label: 'Nederlands' },
        { value: 'pl', label: 'Polski' },
        { value: 'tr', label: 'Türkçe' }
      ]
    }
  ],
  [
    'seekStep',
    {
      default: 0,
      desc: 'Seek step with hidden controls',
      choices: [0, 5, 10, 15, 30, 60].map((value) => ({
        value,
        label: value ? `${value} s` : 'YouTube default'
      }))
    }
  ],
  [
    'enableScrollSeek',
    { default: false, desc: 'Seek with the Magic Remote scroll wheel' }
  ],
  [
    'sortSubscriptions',
    { default: false, desc: 'Sort subscribed channels alphabetically' }
  ],
  ['showStats', { default: false, desc: 'Show playback statistics' }],
  [
    'disablePreviews',
    { default: false, desc: 'Disable video previews while browsing' }
  ],
  ['audioOnlyDim', { default: false, desc: 'Black screen in audio-only mode' }],
  ['enableReturnDislike', { default: false, desc: 'Show dislike count' }],
  [
    'panelSize',
    {
      default: 'medium',
      desc: 'Settings menu size',
      choices: [
        { value: 'large', label: 'Large' },
        { value: 'medium', label: 'Medium' },
        { value: 'small', label: 'Small' }
      ]
    }
  ],
  ['hideLogo', { default: false, desc: 'Hide YouTube logo' }],
  ['showWatch', { default: false, desc: 'Display time in UI' }],
  [
    'clockFormat',
    {
      default: 'auto',
      desc: 'Clock format',
      choices: [
        { value: 'auto', label: 'Automatic' },
        { value: '24h', label: '24 hours' },
        { value: '12h', label: '12 hours' }
      ]
    }
  ],
  ['clockShowDate', { default: false, desc: 'Show date next to the clock' }],
  [
    'notificationPosition',
    {
      default: 'bottom-right',
      desc: 'Notification position',
      choices: [
        { value: 'bottom-right', label: 'Bottom right' },
        { value: 'top-right', label: 'Top right' },
        { value: 'bottom-left', label: 'Bottom left' },
        { value: 'top-left', label: 'Top left' }
      ]
    }
  ],
  [
    'notificationDuration',
    {
      default: 1,
      desc: 'Notification duration',
      choices: [
        { value: 0.6, label: 'Short' },
        { value: 1, label: 'Normal' },
        { value: 1.6, label: 'Long' }
      ]
    }
  ],
  [
    'redButton',
    { default: 'speed', desc: 'Red button', choices: BUTTON_ACTIONS }
  ],
  [
    'yellowButton',
    { default: 'sponsorblock', desc: 'Yellow button', choices: BUTTON_ACTIONS }
  ],
  [
    'blueButton',
    { default: 'audioOnly', desc: 'Blue button', choices: BUTTON_ACTIONS }
  ],
  [
    'showWatchAlways',
    { default: false, desc: 'Keep clock visible during playback' }
  ],
  ['oledTheme', { default: false, desc: 'Pure black (OLED) background' }],
  ['disableAnimations', { default: false, desc: 'Disable UI animations' }],
  [
    'forceHighResVideo',
    { default: false, desc: 'Force max resolution video playback' }
  ],
  [
    'videoCodec',
    {
      default: 'auto',
      desc: 'Video codec',
      choices: [
        { value: 'auto', label: 'Auto' },
        { value: 'vp9', label: 'VP9' },
        { value: 'avc', label: 'AVC (H.264)' },
        { value: 'av1', label: 'AV1' }
      ]
    }
  ],
  [
    'maxResolution',
    {
      default: 0,
      desc: 'Maximum resolution',
      choices: [
        { value: 0, label: 'No limit' },
        { value: 4320, label: '8K' },
        { value: 2160, label: '4K' },
        { value: 1440, label: '1440p' },
        { value: 1080, label: '1080p' },
        { value: 720, label: '720p' },
        { value: 480, label: '480p' }
      ]
    }
  ],
  [
    'removeEndscreen',
    { default: false, desc: 'Remove end screens from video' }
  ],
  ['skipEndscreen', { default: false, desc: 'Skip the end screen' }],
  ['skipSponsorChapters', { default: false, desc: 'Skip sponsor chapters' }],
  ['pauseOnHide', { default: false, desc: 'Pause when the TV switches away' }],
  [
    'videoZoom',
    {
      default: 'original',
      desc: 'Video zoom',
      choices: [
        { value: 'original', label: 'Original' },
        { value: 'fill', label: 'Fill (no black bars)' },
        { value: 'zoom', label: 'Zoom' }
      ]
    }
  ],
  [
    'videoBrightness',
    {
      default: 100,
      desc: 'Brightness',
      choices: [
        { value: 80, label: '80%' },
        { value: 90, label: '90%' },
        { value: 100, label: '100%' },
        { value: 110, label: '110%' },
        { value: 120, label: '120%' },
        { value: 130, label: '130%' },
        { value: 150, label: '150%' }
      ]
    }
  ],
  [
    'videoContrast',
    {
      default: 100,
      desc: 'Contrast',
      choices: [
        { value: 80, label: '80%' },
        { value: 90, label: '90%' },
        { value: 100, label: '100%' },
        { value: 110, label: '110%' },
        { value: 120, label: '120%' },
        { value: 130, label: '130%' }
      ]
    }
  ],
  [
    'videoSaturation',
    {
      default: 100,
      desc: 'Saturation',
      choices: [
        { value: 0, label: '0%' },
        { value: 50, label: '50%' },
        { value: 80, label: '80%' },
        { value: 90, label: '90%' },
        { value: 100, label: '100%' },
        { value: 110, label: '110%' },
        { value: 120, label: '120%' },
        { value: 140, label: '140%' }
      ]
    }
  ],
  [
    'mutePreviews',
    { default: false, desc: 'Mute video previews while browsing' }
  ],
  [
    'enableLiveCatchup',
    { default: false, desc: 'Reduce live stream delay (skip to live edge)' }
  ],
  [
    'autoAccountSelect',
    { default: false, desc: 'Bypass initial account selection on startup' }
  ],
  [
    'enhancedLongPress',
    { default: true, desc: 'Extended long-press menu (queue, not interested)' }
  ],
  ['enableLiveChat', { default: false, desc: 'Show live chat (experimental)' }],
  ['checkForUpdates', { default: true, desc: 'Check for updates' }],
  [
    'rememberPosition',
    { default: true, desc: 'Continue videos where you stopped' }
  ],
  [
    'cleanSubscriptions',
    { default: false, desc: 'Subscriptions: only new videos' }
  ],
  ['numberKeySeek', { default: true, desc: 'Number keys jump to 0-90 %' }],
  ['twemoji', { default: false, desc: 'Show emoji as images (older TVs)' }],
  [
    'subscriptionsOnHome',
    { default: false, desc: 'Newest subscription videos on top of Home' }
  ],
  [
    'perAccountSettings',
    { default: false, desc: 'Separate settings for each YouTube account' }
  ],
  [
    'subtitleAutoTranslate',
    { default: true, desc: 'Translate subtitles automatically if needed' }
  ],
  [
    'subtitleSize',
    {
      default: 'default',
      desc: 'Subtitle size',
      choices: [
        { value: 'default', label: 'YouTube default' },
        { value: 'small', label: 'Small' },
        { value: 'large', label: 'Large' },
        { value: 'xlarge', label: 'Extra large' }
      ]
    }
  ],
  [
    'subtitleBackground',
    {
      default: 'default',
      desc: 'Subtitle background',
      choices: [
        { value: 'default', label: 'YouTube default' },
        { value: 'bg-none', label: 'None (outlined text)' },
        { value: 'bg-semi', label: 'Semi-transparent' },
        { value: 'bg-solid', label: 'Black' }
      ]
    }
  ],
  [
    'subtitlePosition',
    {
      default: 'default',
      desc: 'Subtitle position',
      choices: [
        { value: 'default', label: 'YouTube default' },
        { value: 'raised', label: 'A bit higher' },
        { value: 'top', label: 'Top' }
      ]
    }
  ]
]);

/** Longer explanations, shown at the bottom of the panel on focus. */
const optionHelp = {
  enableAdBlock:
    'Removes video ads, home screen ad tiles, shopping overlays and paid promotion banners.',
  autoAccountSelect:
    'Skips "Who is watching?" on startup and continues with the last used account.',
  sleepTimer:
    'Pauses playback after the chosen time. Starts when chosen and is not kept after restarting the app.',
  showTimeRemaining:
    'Shows how much time is left and when the video ends, including the playback speed, while the controls are visible.',
  startPage:
    'The page opened when the app starts. Launching into a video is not affected.',
  hideNags:
    'Removes sign-in reminders, guest banners and YouTube Premium promotions from feeds and the player.',
  hideLiveStreams: 'Hides running live streams from feeds and search.',
  hideUpcoming: 'Hides upcoming premieres and scheduled streams.',
  hideMembersOnly: 'Hides videos only available to channel members.',
  hideYouThere: 'Playback no longer pauses to ask whether you are still there.',
  mutePreviews: 'Previews that play when a tile is focused start muted.',
  defaultPlaybackSpeed:
    'Applied to every video. The "Cycle playback speed" button steps through the speeds and remembers the choice.',
  forceHighResVideo: 'Selects the highest available resolution on start.',
  videoCodec:
    'Plays only the chosen codec when the video offers it. VP9 or AVC help TVs that stall on AV1 streams. AVC is limited to 1080p.',
  maxResolution:
    'Never plays above this resolution. Saves bandwidth and helps slower TVs.',
  forceOriginalAudio:
    'Drops auto-dubbed audio tracks so videos play in their original language.',
  disableAutoCaptions:
    'YouTube may switch subtitles on when the audio language differs from yours. This stops that.',
  removeEndscreen: 'Hides the video suggestions shown over the last seconds.',
  skipEndscreen:
    'Jumps to the end as soon as the end screen with the suggestions starts, so the next video (or the queue) begins right away.',
  skipSponsorChapters:
    'Skips chapters whose title says sponsor, ad, promo or Werbung, also when SponsorBlock has no data for the video.',
  pauseOnHide:
    'Pauses the video and saves the position when the TV switches to another input, app or standby.',
  videoZoom:
    'Enlarges the picture to cut black bars off widescreen videos. "Fill" removes the bars of 21:9 videos, "Zoom" cuts more. Also available on a color button and in the quick menu.',
  videoBrightness:
    'Brightens dark videos without touching the TV settings. Filters may stutter on older TVs.',
  videoContrast: 'Contrast of the video picture only.',
  videoSaturation:
    'Color intensity of the video picture only; 0% is black and white.',
  continueWatchingRow:
    'Puts the videos you stopped in the middle in a row at the top of Home, from the positions stored on this TV.',
  trackScreenTime:
    'Counts how long videos play, per day and per channel. Stays on this TV; shown below.',
  preferredAudioLanguage:
    'Keeps only the audio track in this language when a video is dubbed into it; otherwise YouTube chooses as usual. Wins over "Prefer original audio".',
  subtitleOffset:
    'Shifts subtitles that are out of sync. "+" shows them later, "-" earlier. Takes effect when subtitles are switched on or the next video starts.',
  hideOlderThan:
    'Hides videos uploaded longer ago than this from feeds and search, based on the age shown on the tile.',
  hideDuplicates:
    'Shows a video only once per page when YouTube puts it in several rows.',
  tileRemainingTime:
    'On videos you started, the tile shows the time left instead of the full length.',
  newSubscriptionsNotice:
    'Shows at start how many new videos your subscriptions posted since the last time.',
  breakReminder:
    'Reminds you to take a break after this much continuous watching.',
  dailyLimit:
    "Warns once a day when today's screen time passes this limit. Nothing is blocked.",
  numberKeyPages:
    'Outside of a video: 1 Home, 2 Subscriptions, 3 Search, 4 Library, 5 History.',
  longBackHome:
    'Holding the Back button for about a second returns to Home instead of one step back at a time.',
  hideMixes:
    'Hides mixes and radio playlists from feeds and keeps autoplay from drifting into a mix.',
  hideLowRated:
    'Hides videos whose share of likes (returnyoutubedislike.com) is below the limit. Ratings are fetched in the background, so a video may still show up the first time.',
  subscriptionsOnHome:
    'Adds a row with the newest videos from your subscriptions at the top of Home. It is refreshed in the background every 15 minutes.',
  perAccountSettings:
    'Each YouTube account gets its own settings (filters, speed, blocked channels). A new account starts with a copy of the current settings.',
  subtitleAutoTranslate:
    "When the video has no subtitles in your chosen language, YouTube's automatic translation of another track is used.",
  subtitleSize: 'Size of the subtitle text.',
  subtitleBackground:
    'Background behind subtitles. "None" draws an outline instead, which covers less of the picture.',
  subtitlePosition:
    'Moves subtitles up, e.g. when they cover burned-in text or the progress bar.',
  checkForUpdates:
    'Looks for a newer release on GitHub once a day and shows a notice. Nothing is installed automatically.',
  rememberPosition:
    'Saves the position of videos longer than 5 minutes and continues there, also without YouTube history. Only used when YouTube starts the video from the beginning.',
  cleanSubscriptions:
    'Hides Shorts and already watched videos on the subscriptions page only, so it shows what is new.',
  numberKeySeek:
    'While watching, 0 jumps to the start, 5 to the middle, 9 to 90 %.',
  twemoji:
    'Older webOS versions show empty boxes instead of emoji. This loads emoji images instead.',
  channelSettings:
    'While watching, set a playback speed or turn SponsorBlock off for this channel only. Applies to all videos of the channel.',
  enhancedLongPress:
    'Hold OK on a video for "Add to queue", "Not interested", "Don\'t recommend channel" and "Block channel". Queued videos play after the current one.',
  enableLiveChat:
    'Shows the chat of live streams and the chat replay of past streams next to the player. Can be toggled with a color button.',
  enableLiveCatchup:
    'Seeks live streams back to the live edge when they fall behind. Paused after you seek back manually.',
  enableReturnDislike:
    'Shows likes and dislikes (returnyoutubedislike.com) in the top-left corner while the controls are visible.',
  removeShorts: 'Removes Shorts tiles and shelves from all pages.',
  hideWatchedVideos:
    'Hides videos that are at least 90% watched. The history page is not filtered.',
  upgradeThumbnails: 'Loads higher resolution thumbnails.',
  enableDeArrow:
    'Replaces clickbait titles with community submissions (dearrow.ajay.app). New titles may only show after a page is reloaded.',
  enableDeArrowThumbnails:
    'Also replaces thumbnails with a frame from the video chosen by the community.',
  language: 'Language of this settings panel and of notifications.',
  blockedKeywords:
    'Videos whose title contains one of these words are hidden (not case-sensitive).',
  hiddenShelves:
    'Shelves whose title contains one of these words are hidden, e.g. "Most relevant" or "Breaking news".',
  minVideoLength: 'Hides videos shorter than this in feeds and search.',
  hideWatchRecommendations:
    'Removes the suggested videos below the player. Playlists are not affected.',
  clockFormat: 'Automatic follows the language of the TV.',
  clockShowDate: 'Shows the weekday and date in front of the time.',
  notificationPosition: 'Where messages like "Skipping sponsor" appear.',
  notificationDuration: 'How long messages stay on screen.',
  redButton: 'Action of the red button while watching a video.',
  yellowButton: 'Action of the yellow button while watching a video.',
  blueButton: 'Action of the blue button while watching a video.',
  subtitleLanguage:
    'Turns subtitles on in this language when the video has them. Uploaded subtitles are preferred over auto-generated ones.',
  seekStep:
    'Left and right jump by this amount while the player controls are hidden.',
  enableScrollSeek:
    'While the progress bar is focused, each wheel notch seeks 3% of the video (3 to 100 seconds).',
  sortSubscriptions:
    'Sorts the channel list on the subscriptions page by name.',
  showStats:
    'Shows resolution, codec, dropped frames and buffer while the controls are visible.',
  disablePreviews: 'Focusing a tile no longer starts a preview.',
  audioOnlyDim:
    'In audio-only mode the screen turns black after 10 seconds without input. Any button wakes it up.',
  sponsorBlockMinLength: 'Very short segments are neither skipped nor offered.',
  sponsorBlockSkipOnce:
    'After seeking back into a skipped segment it plays normally.',
  panelSize:
    'How much of the screen this menu takes up. Pick a smaller size if your TV cuts off the edges of the picture.',
  hideLogo: 'Hides the YouTube logo in the top-right corner.',
  showWatch: 'Shows the current time in the top-right corner.',
  showWatchAlways: 'Keeps the clock visible while a video plays.',
  oledTheme: 'Uses pure black backgrounds to save power on OLED screens.',
  disableAnimations: 'Makes the UI snappier on slower TVs.',
  enableSponsorBlock:
    'Skip or mark sponsored and other segments (sponsor.ajay.app).',
  enableSponsorBlockHighlight:
    'If a video has a highlight, the SponsorBlock button jumps to it.',
  enableSponsorBlockNotifications:
    'Shows a short message when a segment is skipped.'
};

for (const [key, help] of Object.entries(optionHelp)) {
  const option = configOptions.get(key);
  if (option && !option.help) option.help = help;
}

const sponsorBlockModeHelp =
  'Skip: automatic. Ask: the SponsorBlock button skips while the segment plays. Show only: marked on the progress bar.';
for (const option of configOptions.values()) {
  if (option.choices === SPONSORBLOCK_MODES && !option.help) {
    option.help = sponsorBlockModeHelp;
  }
}

const defaultConfig = (() => {
  let ret = {};
  for (const [k, v] of configOptions) {
    ret[k] = v.default;
  }
  return ret;
})();

/** @type {Record<string, DocumentFragment>} as const */
const configFrags = (() => {
  let ret = {};
  for (const k of configOptions.keys()) {
    ret[k] = new DocumentFragment();
  }
  return ret;
})();

/** Key of the settings in use: the shared one or an account profile. */
let storageKey = CONFIG_KEY;

function loadStoredConfig(key = storageKey) {
  const storage = window.localStorage.getItem(key);

  if (storage === null) {
    console.info('Config not set; using defaults.');
    return null;
  }

  try {
    const stored = JSON.parse(storage);

    // 'forceVp9Codec' (boolean) became the 'videoCodec' choice.
    if (stored && 'forceVp9Codec' in stored) {
      if (stored.forceVp9Codec === true && stored.videoCodec === undefined) {
        stored.videoCodec = 'vp9';
      }
      delete stored.forceVp9Codec;
    }

    return stored;
  } catch (err) {
    console.warn('Error parsing stored config:', err);
    return null;
  }
}

// Use defaultConfig as a prototype so writes to localConfig don't change it.
let localConfig = loadStoredConfig() ?? Object.create(defaultConfig);

function configExists(key) {
  return configOptions.has(key);
}

/**
 * Returns the list of choices for a choice option, or `null` otherwise.
 * @param {string} key
 * @returns {{ value: unknown, label: string }[] | null}
 */
export function configGetChoices(key) {
  if (!configExists(key)) {
    throw new Error('tried to get choices for unknown config key: ' + key);
  }

  return configOptions.get(key).choices ?? null;
}

/**
 * Returns the optional longer explanation of an option.
 * @param {string} key
 * @returns {string | null}
 */
export function configGetHelp(key) {
  return configOptions.get(key)?.help ?? null;
}

/**
 * Returns the default value of an option.
 * @param {string} key
 */
export function configGetDefault(key) {
  if (!configExists(key)) {
    throw new Error('tried to get default for unknown config key: ' + key);
  }

  return configOptions.get(key).default;
}

/** Remove all stored settings. Takes full effect after a reload. */
export function configResetAll() {
  window.localStorage.removeItem(storageKey);
  localConfig = Object.create(defaultConfig);
}

/* ---------------------------- Account profiles --------------------------- */

/** Options stored once per TV, outside of account profiles. */
const GLOBAL_KEY = 'ytaf-global';
const GLOBAL_OPTIONS = ['perAccountSettings'];

function readGlobal() {
  try {
    return JSON.parse(window.localStorage.getItem(GLOBAL_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

let activeProfile = null;

/** Id of the account profile in use, or `null` for the shared settings. */
export function configActiveProfile() {
  return activeProfile;
}

/**
 * Switch to the settings of an account (`null`: shared settings). A new
 * profile starts as a copy of the settings in use. Listeners are told about
 * every option that changes.
 * @param {string | null} profileId
 */
export function configUseProfile(profileId) {
  const key = profileId ? `${CONFIG_KEY}:${profileId}` : CONFIG_KEY;
  if (key === storageKey) return;

  const previous = localConfig;
  let next = loadStoredConfig(key);
  if (!next) {
    next = JSON.parse(JSON.stringify(Object.assign({}, previous)));
    window.localStorage[key] = JSON.stringify(next);
  }

  storageKey = key;
  activeProfile = profileId;
  localConfig = next;

  for (const optionKey of configOptions.keys()) {
    if (GLOBAL_OPTIONS.includes(optionKey)) continue;
    const valueOf = (cfg) =>
      cfg[optionKey] !== undefined ? cfg[optionKey] : defaultConfig[optionKey];
    const oldValue = valueOf(previous);
    const newValue = valueOf(next);
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    configFrags[optionKey].dispatchEvent(
      new CustomEvent('ytafConfigChange', {
        detail: { key: optionKey, newValue, oldValue }
      })
    );
  }
}

export function configGetDesc(key) {
  if (!configExists(key)) {
    throw new Error('tried to get desc for unknown config key: ' + key);
  }

  return configOptions.get(key).desc;
}

export function configRead(key) {
  if (!configExists(key)) {
    throw new Error('tried to read unknown config key: ' + key);
  }

  if (GLOBAL_OPTIONS.includes(key)) {
    const value = readGlobal()[key];
    return value !== undefined ? value : defaultConfig[key];
  }

  if (localConfig[key] === undefined) {
    console.warn(
      'Populating key',
      key,
      'with default value',
      defaultConfig[key]
    );

    localConfig[key] = defaultConfig[key];
  }

  const option = configOptions.get(key);
  const value = localConfig[key];

  if (option.choices && !option.choices.some((c) => c.value === value)) {
    const migrated = option.migrate?.(value);
    return option.choices.some((c) => c.value === migrated)
      ? migrated
      : option.default;
  }

  return value;
}

export function configWrite(key, value) {
  if (!configExists(key)) {
    throw new Error('tried to write unknown config key: ' + key);
  }

  let oldValue;
  if (GLOBAL_OPTIONS.includes(key)) {
    const global = readGlobal();
    oldValue = global[key] !== undefined ? global[key] : defaultConfig[key];
    global[key] = value;
    window.localStorage[GLOBAL_KEY] = JSON.stringify(global);
  } else {
    oldValue =
      localConfig[key] !== undefined ? localConfig[key] : defaultConfig[key];
    localConfig[key] = value;
    window.localStorage[storageKey] = JSON.stringify(localConfig);
  }

  console.info('Changing key', key, 'from', oldValue, 'to', value);

  configFrags[key].dispatchEvent(
    new CustomEvent('ytafConfigChange', {
      detail: { key, newValue: value, oldValue }
    })
  );
}

/**
 * Add a listener for changes in the value of a specified config option
 * @param {string} key Config option to monitor
 * @param {(evt: Event) => void} callback Function to be called on change
 */
export function configAddChangeListener(key, callback) {
  const frag = configFrags[key];

  frag.addEventListener('ytafConfigChange', callback);
}

/**
 * Remove a listener for changes in the value of a specified config option
 * @param {string} key Config option to monitor
 * @param {(evt: Event) => void} callback Function to be called on change
 */
export function configRemoveChangeListener(key, callback) {
  const frag = configFrags[key];

  frag.removeEventListener('ytafConfigChange', callback);
}

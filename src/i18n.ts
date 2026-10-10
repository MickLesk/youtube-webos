/**
 * Minimal translations for the settings panel and notifications.
 *
 * English text lives next to the code (config descriptions, notification
 * strings) and doubles as the fallback; this file only holds the other
 * languages. Ids: `opt.<key>`, `help.<key>`, `choice.<English label>`,
 * `ui.<name>` and `msg.<name>`.
 */
import { configRead } from './config';

export type Language = 'en' | 'de';

const de: Record<string, string> = {
  // Options
  'opt.language': 'Sprache',
  'opt.enableAdBlock': 'Werbung blockieren',
  'opt.upgradeThumbnails': 'Thumbnails in höherer Qualität',
  'opt.removeShorts': 'Shorts überall entfernen',
  'opt.hideLiveStreams': 'Livestreams ausblenden',
  'opt.hideUpcoming': 'Anstehende Premieren ausblenden',
  'opt.hideMembersOnly': 'Videos nur für Mitglieder ausblenden',
  'opt.hideWatchedVideos': 'Gesehene Videos in Feeds ausblenden',
  'opt.blockedChannels': 'In Feeds und Suche ausgeblendete Kanäle',
  'opt.blockedKeywords': 'Videos ausblenden, deren Titel enthält',
  'opt.hiddenShelves': 'Regale ausblenden, deren Titel enthält',
  'opt.minVideoLength': 'Mindestlänge von Videos',
  'opt.hideWatchRecommendations': 'Empfehlungen unter dem Player ausblenden',
  'opt.enableDeArrow': 'DeArrow: Clickbait-Titel ersetzen',
  'opt.enableDeArrowThumbnails': 'DeArrow: Clickbait-Thumbnails ersetzen',
  'opt.enableSponsorBlock': 'SponsorBlock aktivieren',
  'opt.enableSponsorBlockSponsor': 'Sponsor',
  'opt.enableSponsorBlockIntro': 'Intro',
  'opt.enableSponsorBlockOutro': 'Outro',
  'opt.enableSponsorBlockInteraction': 'Interaktions-Erinnerung',
  'opt.enableSponsorBlockSelfPromo': 'Eigenwerbung',
  'opt.enableSponsorBlockMusicOfftopic': 'Nicht-Musik-Teil in Musikvideos',
  'opt.enableSponsorBlockPreview': 'Rückblick und Vorschau',
  'opt.enableSponsorBlockFiller': 'Abschweifung (Filler)',
  'opt.enableSponsorBlockHighlight': 'Sprung zum Highlight anbieten',
  'opt.enableSponsorBlockNotifications': 'Hinweise beim Überspringen zeigen',
  'opt.defaultPlaybackSpeed': 'Standard-Wiedergabegeschwindigkeit',
  'opt.sleepTimer': 'Sleep-Timer',
  'opt.showTimeRemaining': 'Restzeit und Endzeit anzeigen',
  'opt.startPage': 'Startseite',
  'opt.hideNags': 'Anmelde- und Premium-Hinweise ausblenden',
  'opt.hideYouThere': 'Nie fragen „Schaust du noch?“',
  'opt.forceOriginalAudio': 'Originalton statt Synchronisation',
  'opt.disableAutoCaptions': 'Untertitel nicht automatisch einschalten',
  'opt.enableReturnDislike': 'Dislikes anzeigen',
  'opt.hideLogo': 'YouTube-Logo ausblenden',
  'opt.showWatch': 'Uhrzeit anzeigen',
  'opt.clockFormat': 'Uhrzeitformat',
  'opt.clockShowDate': 'Datum neben der Uhrzeit anzeigen',
  'opt.notificationPosition': 'Position der Hinweise',
  'opt.notificationDuration': 'Anzeigedauer der Hinweise',
  'opt.redButton': 'Rote Taste',
  'opt.yellowButton': 'Gelbe Taste',
  'opt.blueButton': 'Blaue Taste',
  'opt.showWatchAlways': 'Uhr während der Wiedergabe anzeigen',
  'opt.oledTheme': 'Reines Schwarz (OLED)',
  'opt.disableAnimations': 'Animationen abschalten',
  'opt.forceHighResVideo': 'Immer höchste Auflösung',
  'opt.videoCodec': 'Video-Codec',
  'opt.maxResolution': 'Maximale Auflösung',
  'opt.removeEndscreen': 'Endcards am Videoende entfernen',
  'opt.mutePreviews': 'Vorschauvideos stummschalten',
  'opt.enableLiveCatchup': 'Live-Verzögerung verringern (zur Live-Kante)',
  'opt.autoAccountSelect': 'Kontoauswahl beim Start überspringen',

  // Help
  'help.language': 'Sprache dieses Menüs und der Hinweise.',
  'help.enableAdBlock':
    'Entfernt Videowerbung, Werbekacheln, Shopping-Overlays und Hinweise auf bezahlte Werbung.',
  'help.autoAccountSelect':
    'Überspringt „Wer schaut?“ beim Start und nimmt das zuletzt genutzte Konto.',
  'help.startPage':
    'Die Seite, die beim Start geöffnet wird. Der Start direkt in ein Video ist nicht betroffen.',
  'help.hideNags':
    'Entfernt Anmelde-Erinnerungen, Gast-Banner und YouTube-Premium-Werbung aus Feeds und Player.',
  'help.hideYouThere':
    'Die Wiedergabe pausiert nicht mehr, um nachzufragen, ob du noch da bist.',
  'help.mutePreviews':
    'Vorschauvideos beim Fokussieren einer Kachel starten stumm.',
  'help.defaultPlaybackSpeed':
    'Gilt für jedes Video. Die Taste „Geschwindigkeit wechseln“ schaltet durch und merkt sich die Wahl.',
  'help.sleepTimer':
    'Pausiert nach der gewählten Zeit. Startet bei der Auswahl und gilt nicht über einen Neustart der App hinaus.',
  'help.showTimeRemaining':
    'Zeigt bei eingeblendeten Steuerelementen die Restzeit und das Ende des Videos, inklusive Geschwindigkeit.',
  'help.forceHighResVideo':
    'Wählt beim Start die höchste verfügbare Auflösung.',
  'help.videoCodec':
    'Spielt nur den gewählten Codec, wenn das Video ihn anbietet. VP9 oder AVC helfen Fernsehern, die bei AV1 hängen. AVC reicht bis 1080p.',
  'help.maxResolution':
    'Nie über diese Auflösung abspielen. Spart Bandbreite und hilft langsameren Fernsehern.',
  'help.forceOriginalAudio':
    'Entfernt automatisch synchronisierte Tonspuren, damit Videos in der Originalsprache laufen.',
  'help.disableAutoCaptions':
    'YouTube schaltet Untertitel ein, wenn die Tonsprache von deiner abweicht. Das wird verhindert.',
  'help.removeEndscreen':
    'Blendet die Videovorschläge in den letzten Sekunden aus.',
  'help.enableLiveCatchup':
    'Springt bei Livestreams zurück zur Live-Kante, wenn sie zurückfallen. Pausiert nach manuellem Zurückspulen.',
  'help.enableReturnDislike':
    'Zeigt Likes und Dislikes (returnyoutubedislike.com) oben links, solange die Steuerelemente sichtbar sind.',
  'help.removeShorts': 'Entfernt Shorts-Kacheln und -Regale auf allen Seiten.',
  'help.hideWatchedVideos':
    'Blendet Videos aus, die zu mindestens 90 % gesehen sind. Der Verlauf wird nicht gefiltert.',
  'help.hideLiveStreams':
    'Blendet laufende Livestreams in Feeds und Suche aus.',
  'help.hideUpcoming': 'Blendet anstehende Premieren und geplante Streams aus.',
  'help.hideMembersOnly':
    'Blendet Videos aus, die nur Kanalmitgliedern offenstehen.',
  'help.blockedKeywords':
    'Videos, deren Titel eines dieser Wörter enthält, werden ausgeblendet (Groß-/Kleinschreibung egal).',
  'help.hiddenShelves':
    'Regale, deren Titel eines dieser Wörter enthält, werden ausgeblendet, z. B. „Am relevantesten“ oder „Nachrichten“.',
  'help.minVideoLength': 'Blendet kürzere Videos in Feeds und Suche aus.',
  'help.hideWatchRecommendations':
    'Entfernt die vorgeschlagenen Videos unter dem Player. Playlists sind nicht betroffen.',
  'help.upgradeThumbnails': 'Lädt Thumbnails in höherer Auflösung.',
  'help.enableDeArrow':
    'Ersetzt Clickbait-Titel durch Vorschläge der Community (dearrow.ajay.app). Neue Titel erscheinen teils erst nach erneutem Laden einer Seite.',
  'help.enableDeArrowThumbnails':
    'Ersetzt zusätzlich Thumbnails durch ein von der Community gewähltes Standbild.',
  'help.hideLogo': 'Blendet das YouTube-Logo oben rechts aus.',
  'help.showWatch': 'Zeigt die Uhrzeit oben rechts.',
  'help.showWatchAlways': 'Die Uhr bleibt während der Wiedergabe sichtbar.',
  'help.clockFormat': 'Automatisch folgt der Sprache des Fernsehers.',
  'help.clockShowDate': 'Zeigt Wochentag und Datum vor der Uhrzeit.',
  'help.notificationPosition':
    'Wo Hinweise wie „Sponsor wird übersprungen“ erscheinen.',
  'help.notificationDuration': 'Wie lange Hinweise sichtbar bleiben.',
  'help.redButton': 'Aktion der roten Taste beim Ansehen eines Videos.',
  'help.yellowButton': 'Aktion der gelben Taste beim Ansehen eines Videos.',
  'help.blueButton': 'Aktion der blauen Taste beim Ansehen eines Videos.',
  'help.oledTheme':
    'Reines Schwarz als Hintergrund, spart Strom auf OLED-Fernsehern.',
  'help.disableAnimations':
    'Macht die Oberfläche auf langsamen Fernsehern flotter.',
  'help.enableSponsorBlock':
    'Gesponserte und andere Abschnitte überspringen oder markieren (sponsor.ajay.app).',
  'help.enableSponsorBlockHighlight':
    'Hat ein Video ein Highlight, springt die SponsorBlock-Taste dorthin.',
  'help.enableSponsorBlockNotifications':
    'Zeigt einen kurzen Hinweis, wenn ein Abschnitt übersprungen wird.',
  'help.sponsorBlockMode':
    'Überspringen: automatisch. Fragen: die SponsorBlock-Taste überspringt, solange der Abschnitt läuft. Nur anzeigen: Markierung im Fortschrittsbalken.',

  // Choice labels
  'choice.Skip': 'Überspringen',
  'choice.Ask': 'Fragen',
  'choice.Show only': 'Nur anzeigen',
  'choice.Off': 'Aus',
  'choice.Auto': 'Automatisch',
  'choice.Automatic': 'Automatisch',
  'choice.No limit': 'Keine Grenze',
  'choice.Home': 'Startseite',
  'choice.Subscriptions': 'Abos',
  'choice.Library': 'Mediathek',
  'choice.History': 'Verlauf',
  'choice.24 hours': '24 Stunden',
  'choice.12 hours': '12 Stunden',
  'choice.Bottom right': 'Unten rechts',
  'choice.Top right': 'Oben rechts',
  'choice.Bottom left': 'Unten links',
  'choice.Top left': 'Oben links',
  'choice.Short': 'Kurz',
  'choice.Normal': 'Normal',
  'choice.Long': 'Lang',
  'choice.YouTube default': 'YouTube-Standard',
  'choice.Cycle playback speed': 'Geschwindigkeit wechseln',
  'choice.SponsorBlock skip/highlight': 'SponsorBlock überspringen/Highlight',
  'choice.Audio-only mode': 'Nur-Audio-Modus',

  // Panel
  'ui.General': 'Allgemein',
  'ui.Playback': 'Wiedergabe',
  'ui.Feeds': 'Feeds',
  'ui.Blocking': 'Sperren',
  'ui.Appearance': 'Darstellung',
  'ui.Buttons': 'Tasten',
  'ui.SponsorBlock': 'SponsorBlock',
  'ui.Diagnostics': 'Diagnose',
  'ui.blockedChannels': 'Gesperrte Kanäle',
  'ui.blockedChannelsEmpty':
    'Keine. Öffne dieses Menü während eines Videos, um dessen Kanal zu sperren.',
  'ui.blockChannel': 'Kanal sperren: {name}',
  'ui.unblock': 'Entsperren: {name}',
  'ui.remove': 'Entfernen: {name}',
  'ui.add': 'Hinzufügen',
  'ui.listEmpty': 'Noch keine Einträge.',
  'ui.inputHint': 'Wort eingeben, dann OK',
  'ui.noLog': 'Keine Warnungen oder Fehler protokolliert.',
  'ui.clearLog': 'Protokoll leeren',
  'ui.reset': 'Alle Einstellungen zurücksetzen',
  'ui.resetConfirm': 'Zum Zurücksetzen erneut OK drücken',
  'ui.keyGreen': 'Einstellungen',

  // Notifications
  'msg.openSettings': '[GRÜN] drücken, um die Einstellungen zu öffnen',
  'msg.speed': 'Wiedergabegeschwindigkeit: {speed}x',
  'msg.audioOnly': 'Nur-Audio-Modus: {state}',
  'msg.audioOnlyOverlay': 'Nur-Audio-Modus aktiv – {button} zum Umschalten',
  'msg.on': 'An',
  'msg.off': 'Aus',
  'msg.skipping': '{name} wird übersprungen',
  'msg.askSkip': '{button} drücken, um {name} zu überspringen',
  'msg.highlightAvailable': 'Highlight verfügbar – {button} springt dorthin',
  'msg.jumpHighlight': 'Springe zum Highlight',
  'msg.sleepArmed': 'Sleep-Timer: Pause in {minutes} Minuten',
  'msg.sleepWarning': 'Sleep-Timer: Pause in 1 Minute',
  'msg.sleepFired': 'Sleep-Timer: Wiedergabe pausiert',
  'msg.channelBlocked': 'Kanal gesperrt: {name}',

  // SponsorBlock segment names used in notifications
  'segment.sponsor': 'Sponsor',
  'segment.intro': 'Intro',
  'segment.outro': 'Outro',
  'segment.interaction': 'Interaktions-Erinnerung',
  'segment.selfpromo': 'Eigenwerbung',
  'segment.music_offtopic': 'Nicht-Musik-Teil',
  'segment.preview': 'Rückblick/Vorschau',
  'segment.filler': 'Abschweifung',

  // Color names used in notifications
  'color.red': '[ROT]',
  'color.green': '[GRÜN]',
  'color.yellow': '[GELB]',
  'color.blue': '[BLAU]'
};

const dictionaries: Record<Language, Record<string, string>> = { en: {}, de };

export function getLanguage(): Language {
  const configured = configRead('language');
  if (configured === 'en' || configured === 'de') return configured;
  return (navigator.language || '').toLowerCase().startsWith('de')
    ? 'de'
    : 'en';
}

/**
 * Translate `id`, falling back to the English `fallback`. `{name}` style
 * placeholders are replaced from `vars`.
 */
export function t(
  id: string,
  fallback: string,
  vars?: Record<string, string | number>
): string {
  let text = dictionaries[getLanguage()][id] ?? fallback;
  if (vars) {
    for (const name of Object.keys(vars)) {
      text = text.split(`{${name}}`).join(String(vars[name]));
    }
  }
  return text;
}

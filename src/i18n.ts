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
  'opt.enhancedLongPress':
    'Erweitertes Langdruck-Menü (Warteschlange, Kein Interesse)',
  'opt.enableLiveChat': 'Live-Chat anzeigen (experimentell)',
  'opt.autoAccountSelect': 'Kontoauswahl beim Start überspringen',
  'opt.subtitleLanguage': 'Untertitel',
  'opt.enableScrollSeek': 'Mit dem Scrollrad der Magic Remote spulen',
  'opt.sortSubscriptions': 'Abonnierte Kanäle alphabetisch sortieren',
  'opt.seekStep': 'Spulschritt bei ausgeblendeter Steuerung',
  'opt.showStats': 'Wiedergabestatistik anzeigen',
  'opt.disablePreviews': 'Vorschauvideos beim Stöbern abschalten',
  'opt.audioOnlyDim': 'Schwarzer Bildschirm im Nur-Audio-Modus',
  'opt.sponsorBlockMinLength': 'Abschnitte ignorieren, kürzer als',
  'opt.sponsorBlockSkipOnce': 'Jeden Abschnitt nur einmal überspringen',

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
  'help.enhancedLongPress':
    'OK auf einem Video gedrückt halten für „Zur Warteschlange hinzufügen“, „Kein Interesse“ und „Kanal nicht empfehlen“. Videos in der Warteschlange laufen nach dem aktuellen.',
  'help.enableLiveChat':
    'Zeigt den Chat von Livestreams und die Chat-Wiedergabe vergangener Streams neben dem Player. Mit einer Farbtaste ein- und ausblendbar.',
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
  'help.enableScrollSeek':
    'Ist der Fortschrittsbalken fokussiert, spult jede Raste 3 % des Videos (3 bis 100 Sekunden).',
  'help.sortSubscriptions':
    'Sortiert die Kanalliste auf der Abo-Seite nach Namen.',
  'help.subtitleLanguage':
    'Schaltet Untertitel in dieser Sprache ein, wenn das Video welche hat. Hochgeladene Untertitel werden automatisch erzeugten vorgezogen.',
  'help.seekStep':
    'Links und rechts springen um diesen Wert, solange die Steuerelemente ausgeblendet sind.',
  'help.showStats':
    'Zeigt Auflösung, Codec, verworfene Bilder und Puffer, solange die Steuerelemente sichtbar sind.',
  'help.disablePreviews':
    'Das Fokussieren einer Kachel startet keine Vorschau mehr.',
  'help.audioOnlyDim':
    'Im Nur-Audio-Modus wird der Bildschirm nach 10 Sekunden ohne Eingabe schwarz. Jede Taste weckt ihn wieder.',
  'help.sponsorBlockMinLength':
    'Sehr kurze Abschnitte werden weder übersprungen noch angeboten.',
  'help.sponsorBlockSkipOnce':
    'Spulst du in einen übersprungenen Abschnitt zurück, läuft er normal.',
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
  'choice.Next chapter': 'Nächstes Kapitel',
  'choice.Toggle playback statistics': 'Statistik ein/aus',
  'choice.Picture-in-picture': 'Bild-in-Bild',
  'choice.Play next in queue': 'Nächstes aus der Warteschlange',
  'choice.Show/hide live chat': 'Live-Chat ein/aus',

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
  'ui.new': 'Neu',
  'ui.apply': 'Anwenden',
  'ui.confirm': 'Zum Anwenden erneut OK',
  'ui.applied': 'Angewendet',
  'ui.preset.recommended': 'Empfohlen',
  'ui.preset.minimal': 'Minimal',
  'ui.preset.off': 'Alles aus',
  'ui.presetHelp.recommended':
    'Standardwerte plus die beliebtesten Extras: keine Shorts, stumme Vorschauen, keine Endcards, Restzeit, Dislikes und schärfere Thumbnails.',
  'ui.presetHelp.minimal':
    'Nur Werbeblocker, SponsorBlock und kein „Schaust du noch?“. Alles andere aus.',
  'ui.presetHelp.off':
    'Schaltet alle Extras ab und gibt die Farbtasten an YouTube zurück. Gesperrte Kanäle und Wörter bleiben erhalten.',
  'ui.group.Quick setup': 'Schnelleinrichtung',
  'ui.group.Start and account': 'Start und Konto',
  'ui.group.Interruptions': 'Unterbrechungen',
  'ui.group.App': 'App',
  'ui.group.Video': 'Video',
  'ui.group.Subtitles': 'Untertitel',
  'ui.group.Controls': 'Bedienung',
  'ui.group.Display': 'Anzeige',
  'ui.group.Live': 'Live',
  'ui.group.Filter': 'Filter',
  'ui.group.Subscriptions': 'Abos',
  'ui.group.Thumbnails and titles': 'Thumbnails und Titel',
  'ui.group.Clock': 'Uhr',
  'ui.group.Notifications': 'Hinweise',
  'ui.group.Interface': 'Oberfläche',
  'ui.group.Color buttons': 'Farbtasten',
  'ui.group.SponsorBlock': 'SponsorBlock',
  'ui.group.Categories': 'Kategorien',
  'ui.pageHelp.General':
    'Schnelleinrichtung, Sprache, Start und alles, womit YouTube dich unterbricht.',
  'ui.pageHelp.Playback':
    'Qualität, Tempo, Untertitel und Bedienung beim Schauen.',
  'ui.pageHelp.Feeds':
    'Was auf der Startseite, in den Abos und neben Videos erscheint.',
  'ui.pageHelp.Blocking':
    'Kanäle, Wörter in Titeln und ganze Regale ausblenden.',
  'ui.pageHelp.Appearance': 'Uhr, Hinweise und das Aussehen der App.',
  'ui.pageHelp.Buttons':
    'Was die rote, gelbe und blaue Taste machen. Grün öffnet immer dieses Menü.',
  'ui.pageHelp.SponsorBlock':
    'Sponsoren, Intros und andere von der Community gemeldete Abschnitte überspringen.',
  'ui.pageHelp.Diagnostics':
    'Selbsttest, Update-Status, Warnungen und komplettes Zurücksetzen.',
  'ui.hintNav': 'OK oder › öffnet den Bereich',
  'ui.hintChoice': '‹ › ändert den Wert, OK nächster Wert',
  'ui.hintToggle': 'OK schaltet ein oder aus',
  'ui.keyGreen': 'Einstellungen',
  'ui.settingsEntry': 'YouTube Extended',
  'ui.settingsEntrySummary':
    'Werbeblocker, SponsorBlock, Feeds, Tasten und mehr',
  'ui.addToQueue': 'Zur Warteschlange hinzufügen',
  'ui.notInterested': 'Kein Interesse',
  'ui.dontRecommendChannel': 'Kanal nicht empfehlen',
  'ui.play': 'Abspielen',
  'ui.saveWatchLater': 'Zu „Später ansehen“ hinzufügen',
  'ui.removeWatchLater': 'Aus „Später ansehen“ entfernen',
  'ui.saveToPlaylist': 'In Playlist speichern',

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
  'msg.seek': '{delta} s',
  'msg.updated':
    'Aktualisiert auf v{version} – neue Optionen in den Einstellungen (grüne Taste)',
  'msg.noChapter': 'Kein weiteres Kapitel',
  'msg.nextChapter': 'Nächstes Kapitel',
  'msg.queueAdded': 'Zur Warteschlange hinzugefügt ({count}): {title}',
  'msg.queueDuplicate': 'Schon in der Warteschlange',
  'msg.queueCleared': 'Warteschlange geleert',
  'msg.queuePlaying': 'Als Nächstes: {title} (noch {count})',
  'msg.queueEmpty': 'Die Warteschlange ist leer',
  'msg.feedbackSent': 'Danke, YouTube zeigt weniger solche Videos',
  'msg.feedbackFailed': 'Feedback nicht verfügbar',
  'msg.pipUnavailable': 'Bild-in-Bild ist nicht verfügbar',
  'msg.noLiveChat': 'Kein Chat für dieses Video',
  'msg.updateAvailable':
    'Update verfügbar: v{version} (installiert v{current})',
  'msg.resumed': 'Weiter bei {time}',
  'opt.checkForUpdates': 'Nach Updates suchen',
  'opt.rememberPosition': 'Videos dort fortsetzen, wo du aufgehört hast',
  'opt.cleanSubscriptions': 'Abos: nur neue Videos',
  'opt.numberKeySeek': 'Zifferntasten springen auf 0–90 %',
  'opt.twemoji': 'Emojis als Bilder anzeigen (ältere Fernseher)',
  'opt.channelSettings': 'Kanal-Einstellungen',
  'help.checkForUpdates':
    'Sucht einmal am Tag auf GitHub nach einer neueren Version und zeigt einen Hinweis. Es wird nichts automatisch installiert.',
  'help.rememberPosition':
    'Merkt sich die Position von Videos über 5 Minuten und setzt dort fort, auch ohne YouTube-Verlauf. Greift nur, wenn YouTube das Video von vorne startet.',
  'help.cleanSubscriptions':
    'Blendet nur auf der Abo-Seite Shorts und bereits gesehene Videos aus, damit dort nur Neues steht.',
  'help.numberKeySeek':
    'Während der Wiedergabe springt 0 an den Anfang, 5 in die Mitte, 9 auf 90 %.',
  'help.twemoji':
    'Ältere webOS-Versionen zeigen leere Kästchen statt Emojis. Damit werden stattdessen Emoji-Bilder geladen.',
  'help.channelSettings':
    'Während ein Video läuft: Geschwindigkeit festlegen oder SponsorBlock nur für diesen Kanal abschalten. Gilt für alle Videos des Kanals.',
  'choice.Quick menu': 'Schnellmenü',
  'ui.channelSettings': 'Kanal-Einstellungen',
  'ui.channelSettingsFor': 'Dieser Kanal: {name}',
  'ui.channelSpeed': 'Geschwindigkeit für diesen Kanal: {speed}',
  'ui.channelSponsorBlock': 'SponsorBlock für diesen Kanal: {state}',
  'ui.channelNoSponsorBlock': 'ohne SponsorBlock',
  'ui.channelReset': 'Zurücksetzen: {name} ({settings})',
  'ui.channelSettingsEmpty':
    'Öffne dieses Menü während eines Videos, um Geschwindigkeit oder SponsorBlock für diesen Kanal festzulegen.',
  'ui.default': 'Standard',
  'ui.updateAvailable': 'Version {current}, Update verfügbar: {version}',
  'ui.versionCurrent': 'Version {current}',
  'selftest.Command hook': 'Befehls-Hook',
  'selftest.API client': 'API-Client',
  'selftest.Player service': 'Player-Dienst',
  'selftest.Video player': 'Videoplayer',
  'selftest.startFailed': 'Start fehlgeschlagen',
  'selftest.pending': 'noch nicht geprüft',
  'selftest.missing': 'nicht gefunden',
  'selftest.affects.Command hook':
    'Kontoauswahl überspringen, Langdruck-Menü, Einstellungs-Eintrag',
  'selftest.affects.API client': '„Kein Interesse“, „Kanal nicht empfehlen“',
  'selftest.affects.Player service': 'Bild-in-Bild',
  'selftest.affects.Video player':
    'Geschwindigkeit, SponsorBlock, Einblendungen, Warteschlange',
  'quick.speed': 'Tempo: {speed}x',
  'quick.subtitles': 'Untertitel: {state}',
  'quick.audioOnly': 'Nur Audio: {state}',
  'quick.sleep': 'Sleep-Timer: {value}',
  'quick.resolution': 'Max. Auflösung: {value}',
  'quick.stats': 'Statistik: {state}',
  'quick.chapter': 'Nächstes Kapitel',
  'quick.queue': 'Nächstes aus Warteschlange ({count})',
  'quick.pip': 'Bild-in-Bild',
  'opt.subtitleAutoTranslate': 'Untertitel bei Bedarf automatisch übersetzen',
  'opt.subtitleSize': 'Untertitel-Größe',
  'opt.subtitleBackground': 'Untertitel-Hintergrund',
  'opt.subtitlePosition': 'Untertitel-Position',
  'opt.perAccountSettings': 'Eigene Einstellungen pro YouTube-Konto',
  'opt.subscriptionsOnHome': 'Neueste Abo-Videos oben auf der Startseite',
  'help.subtitleAutoTranslate':
    'Hat ein Video keine Untertitel in deiner Sprache, wird YouTubes automatische Übersetzung einer anderen Spur genutzt.',
  'help.subtitleSize': 'Größe der Untertitel-Schrift.',
  'help.subtitleBackground':
    'Hintergrund hinter den Untertiteln. „Keiner“ zeichnet stattdessen einen Umriss und verdeckt weniger vom Bild.',
  'help.subtitlePosition':
    'Schiebt Untertitel nach oben, z. B. wenn sie eingeblendeten Text oder die Fortschrittsleiste verdecken.',
  'help.perAccountSettings':
    'Jedes YouTube-Konto bekommt eigene Einstellungen (Filter, Tempo, gesperrte Kanäle). Ein neues Konto startet mit einer Kopie der aktuellen Einstellungen.',
  'help.subscriptionsOnHome':
    'Fügt oben auf der Startseite eine Reihe mit den neuesten Videos deiner Abos ein. Sie wird alle 15 Minuten im Hintergrund aktualisiert.',
  'choice.Small': 'Klein',
  'choice.Large': 'Groß',
  'choice.Extra large': 'Sehr groß',
  'choice.None (outlined text)': 'Keiner (Umriss)',
  'choice.Semi-transparent': 'Halbtransparent',
  'choice.Black': 'Schwarz',
  'choice.A bit higher': 'Etwas höher',
  'choice.Top': 'Oben',
  'ui.channelResolution': 'Max. Auflösung für diesen Kanal: {value}',
  'ui.timeSaved': 'Zeit gespart: {time} ({count} Segmente übersprungen)',
  'ui.resetTimeSaved': 'Gesparte Zeit zurücksetzen',
  'ui.profileUnknown': 'Konto-Einstellungen: Konto nicht erkannt',
  'ui.profileActive': 'Konto-Einstellungen: Profil …{id}',
  'ui.homeSubscriptions': 'Neu in deinen Abos',
  'selftest.timing':
    'Verarbeitung: {count} Antworten, im Schnitt {avg} ms, maximal {max} ms',

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

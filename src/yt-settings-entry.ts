/**
 * Adds an entry to YouTube's own settings page that opens our settings,
 * as an alternative to the green button.
 *
 * Adapted from https://github.com/reisxd/TizenTube (mods/ui/customYTSettings.js)
 */
import { addParseHandler } from './hooks/json-parse';
import { t } from './i18n';
import { customActionEndpoint, setCustomActionHandler } from './innertube';
import { showOptionsPanel } from './options-panel';

const CATEGORY_ID = 'ytaf_category';

function runs(text: string) {
  return { runs: [{ text }] };
}

addParseHandler('yt-settings-entry', (res) => {
  // The settings page response: a title and a list of setting categories.
  if (!res.title || !Array.isArray(res.items)) return;
  const items = res.items as Record<string, unknown>[];
  if (!items.some((item) => 'settingCategoryCollectionRenderer' in item)) {
    return;
  }
  if (JSON.stringify(items).indexOf(CATEGORY_ID) !== -1) return;

  const title = t('ui.settingsEntry', 'YouTube Extended');
  items.unshift({
    settingCategoryCollectionRenderer: {
      categoryId: CATEGORY_ID,
      focused: false,
      trackingParams: 'null',
      items: [
        {
          settingActionRenderer: {
            title: runs(title),
            summary: runs(
              t(
                'ui.settingsEntrySummary',
                'Ad blocking, SponsorBlock, feeds, buttons and more'
              )
            ),
            actionLabel: runs(title),
            itemId: 'ytaf_open_settings',
            serviceEndpoint: customActionEndpoint('openSettings', {}),
            trackingParams: 'null',
            thumbnail: {
              thumbnails: [
                { url: 'https://www.gstatic.com/ytlr/img/parent_code.png' }
              ]
            }
          }
        }
      ]
    }
  });
});

setCustomActionHandler('openSettings', () => showOptionsPanel(true));

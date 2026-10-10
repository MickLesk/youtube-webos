/**
 * Sorts the channel list on the subscriptions page alphabetically. The
 * first entry ("All") keeps its place.
 */
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null;
}

function titleOf(tab: unknown): string {
  const renderer = isObject(tab) ? tab.tabRenderer : null;
  const title = isObject(renderer) ? renderer.title : null;
  if (typeof title === 'string') return title;
  if (isObject(title)) {
    if (typeof title.simpleText === 'string') return title.simpleText;
    if (Array.isArray(title.runs)) {
      return title.runs.map((r) => (isObject(r) ? r.text : '')).join('');
    }
  }
  return '';
}

addParseHandler('sort-subscriptions', (res) => {
  if (!configRead('sortSubscriptions')) return;

  const nav = (
    ((res.contents as Json | undefined)?.tvBrowseRenderer as Json | undefined)
      ?.content as Json | undefined
  )?.tvSecondaryNavRenderer;
  if (!isObject(nav) || !Array.isArray(nav.sections)) return;

  for (const section of nav.sections) {
    const renderer = isObject(section)
      ? section.tvSecondaryNavSectionRenderer
      : null;
    if (!isObject(renderer) || !Array.isArray(renderer.tabs)) continue;

    const [first, ...rest] = renderer.tabs as unknown[];
    if (!rest.length) continue;

    const collator = new Intl.Collator(navigator.language, {
      sensitivity: 'base'
    });
    rest.sort((a, b) => collator.compare(titleOf(a), titleOf(b)));
    renderer.tabs = [first, ...rest];
  }
});

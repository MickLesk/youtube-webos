/**
 * Hides entries of YouTube's left sidebar (Music, Gaming, News, ...). The
 * sidebar comes from the guide response; the entries seen there are kept
 * for the settings panel, where each one gets a switch.
 */
import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';

type Json = Record<string, unknown>;

const ENTRIES_KEY = 'ytaf-sidebar-entries';

export interface SidebarEntry {
  id: string;
  title: string;
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isObject(value)) return '';
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (Array.isArray(value.runs)) {
    return value.runs
      .map((run) =>
        isObject(run) && typeof run.text === 'string' ? run.text : ''
      )
      .join('');
  }
  return '';
}

/** Stable id of a guide entry: its browse id, or "search". */
function entryId(entry: Json): string | null {
  const endpoint = entry.navigationEndpoint;
  if (!isObject(endpoint)) return null;
  const browse = endpoint.browseEndpoint;
  if (isObject(browse) && typeof browse.browseId === 'string') {
    return browse.browseId;
  }
  if (isObject(endpoint.searchEndpoint)) return 'search';
  return null;
}

/** Entries of the last sidebar seen, for the settings panel. */
export function getSidebarEntries(): SidebarEntry[] {
  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    const list = raw ? (JSON.parse(raw) as SidebarEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: SidebarEntry[]) {
  try {
    window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // Not critical.
  }
}

export function isSidebarEntryHidden(id: string) {
  return (configRead('hiddenSidebarEntries') as string[]).indexOf(id) !== -1;
}

addParseHandler('sidebar', (res) => {
  const items = res.items;
  if (!Array.isArray(items) || !isObject(items[0])) return;
  if (!('guideSectionRenderer' in items[0])) return;

  const hidden = configRead('hiddenSidebarEntries') as string[];
  const seen: SidebarEntry[] = [];

  for (let i = items.length - 1; i >= 0; i--) {
    const section = (items[i] as Json).guideSectionRenderer;
    if (!isObject(section) || !Array.isArray(section.items)) continue;
    const entries: unknown[] = section.items;
    section.items = entries.filter((item) => {
      const entry = isObject(item) ? item.guideEntryRenderer : undefined;
      if (!isObject(entry)) return true;
      const id = entryId(entry);
      if (!id) return true;
      // Channels in the sidebar have thumbnails; only fixed entries get a switch.
      if (!entry.thumbnail) {
        seen.push({ id, title: textOf(entry.formattedTitle) || id });
      }
      return hidden.indexOf(id) === -1;
    });
    if (!(section.items as unknown[]).length) items.splice(i, 1);
  }

  if (seen.length) saveEntries(seen);
});

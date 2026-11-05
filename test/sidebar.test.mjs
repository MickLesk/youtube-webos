import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const { configResetAll, configWrite } = await import('../src/config.js');
const { getSidebarEntries } = await import('../src/sidebar.ts');

function entry(title, browseId) {
  return {
    guideEntryRenderer: {
      formattedTitle: { simpleText: title },
      navigationEndpoint: { browseEndpoint: { browseId } }
    }
  };
}

function guide() {
  return JSON.parse(
    JSON.stringify({
      responseContext: {},
      items: [
        {
          guideSectionRenderer: {
            items: [
              entry('Abos', 'FEsubscriptions'),
              {
                guideEntryRenderer: {
                  formattedTitle: { simpleText: 'Suche' },
                  navigationEndpoint: { searchEndpoint: {} }
                }
              }
            ]
          }
        },
        {
          guideSectionRenderer: {
            items: [
              entry('Musik', 'FEtopics_music'),
              entry('Gaming', 'FEtopics_gaming')
            ]
          }
        }
      ]
    })
  );
}

const titles = (res) =>
  res.items.map((s) =>
    s.guideSectionRenderer.items.map(
      (i) => i.guideEntryRenderer.formattedTitle.simpleText
    )
  );

describe('sidebar', () => {
  beforeEach(() => {
    configResetAll();
    globalThis.localStorage.clear();
  });

  it('remembers the entries and keeps them all by default', () => {
    const res = guide();
    assert.deepEqual(titles(res), [
      ['Abos', 'Suche'],
      ['Musik', 'Gaming']
    ]);
    assert.deepEqual(
      getSidebarEntries().map((e) => e.id),
      ['FEtopics_music', 'FEtopics_gaming', 'FEsubscriptions', 'search']
    );
  });

  it('removes hidden entries and empty sections', () => {
    configWrite('hiddenSidebarEntries', ['FEtopics_music', 'FEtopics_gaming']);
    assert.deepEqual(titles(guide()), [['Abos', 'Suche']]);
  });
});

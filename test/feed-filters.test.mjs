import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const { configResetAll, configWrite } = await import('../src/config.js');
await import('../src/feed-filters.ts');
const { getParseStats } = await import('../src/hooks/json-parse.ts');

function tile(id, { channel = 'Some channel', title = id, extra = {} } = {}) {
  return {
    tileRenderer: {
      contentId: id,
      style: 'TILE_STYLE_YTLR_DEFAULT',
      onSelectCommand: { watchEndpoint: { videoId: id } },
      metadata: {
        tileMetadataRenderer: {
          title: { simpleText: title },
          lines: [
            {
              lineRenderer: {
                items: [{ lineItemRenderer: { text: { simpleText: channel } } }]
              }
            }
          ]
        }
      },
      header: { tileHeaderRenderer: { thumbnailOverlays: [] } },
      ...extra
    }
  };
}

function shortsTile(id) {
  return tile(id, {
    extra: { onSelectCommand: { reelWatchEndpoint: { videoId: id } } }
  });
}

function withDuration(id, text) {
  return tile(id, {
    extra: {
      header: {
        tileHeaderRenderer: {
          thumbnailOverlays: [
            {
              thumbnailOverlayTimeStatusRenderer: { text: { simpleText: text } }
            }
          ]
        }
      }
    }
  });
}

function watched(id, percent) {
  return tile(id, {
    extra: {
      header: {
        tileHeaderRenderer: {
          thumbnailOverlays: [
            {
              thumbnailOverlayResumePlaybackRenderer: {
                percentDurationWatched: percent
              }
            }
          ]
        }
      }
    }
  });
}

/** A browse response with one shelf; parsed like YouTube's own requests. */
function parseFeed(items, shelfExtra = {}) {
  const response = {
    responseContext: {},
    contents: {
      tvBrowseRenderer: {
        content: {
          sectionListRenderer: {
            contents: [
              {
                shelfRenderer: {
                  title: { simpleText: 'Recommended' },
                  content: { horizontalListRenderer: { items } },
                  ...shelfExtra
                }
              }
            ]
          }
        }
      }
    }
  };
  return JSON.parse(JSON.stringify(response));
}

function idsOf(res) {
  const shelves =
    res.contents.tvBrowseRenderer.content.sectionListRenderer.contents;
  if (!shelves.length) return null;
  return shelves[0].shelfRenderer.content.horizontalListRenderer.items.map(
    (item) => item.tileRenderer.contentId
  );
}

describe('feed filters', () => {
  beforeEach(() => {
    configResetAll();
    globalThis.localStorage.clear();
  });

  it('leaves feeds alone with the default settings', () => {
    const res = parseFeed([tile('a'), shortsTile('b'), watched('c', 100)]);
    assert.deepEqual(idsOf(res), ['a', 'b', 'c']);
  });

  it('removes Shorts tiles and Shorts shelves', () => {
    configWrite('removeShorts', true);
    assert.deepEqual(idsOf(parseFeed([tile('a'), shortsTile('b')])), ['a']);

    const res = parseFeed([tile('a')], {
      tvhtml5ShelfRendererType: 'TVHTML5_SHELF_RENDERER_TYPE_SHORTS'
    });
    assert.equal(idsOf(res), null);
  });

  it('hides watched videos from 90 %', () => {
    configWrite('hideWatchedVideos', true);
    const res = parseFeed([watched('a', 50), watched('b', 90), tile('c')]);
    assert.deepEqual(idsOf(res), ['a', 'c']);
  });

  it('hides blocked channels and title keywords', () => {
    configWrite('blockedChannels', ['Spam TV']);
    configWrite('blockedKeywords', ['reaction']);
    const res = parseFeed([
      tile('a', { channel: 'Spam TV' }),
      tile('b', { title: 'My REACTION to things' }),
      tile('c')
    ]);
    assert.deepEqual(idsOf(res), ['c']);
  });

  it('hides shelves by title', () => {
    configWrite('hiddenShelves', ['recommend']);
    assert.equal(idsOf(parseFeed([tile('a')])), null);
  });

  it('hides videos shorter than the minimum length', () => {
    configWrite('minVideoLength', 2);
    const res = parseFeed([
      withDuration('a', '1:59'),
      withDuration('b', '2:00'),
      withDuration('c', '1:02:03'),
      tile('d')
    ]);
    assert.deepEqual(idsOf(res), ['b', 'c', 'd']);
  });

  it('hides mixes but keeps videos that continue into one', () => {
    configWrite('hideMixes', true);
    const mix = tile('m', {
      extra: {
        contentType: 'TILE_CONTENT_TYPE_PLAYLIST',
        onSelectCommand: {
          watchEndpoint: { videoId: 'm', playlistId: 'RDm' }
        }
      }
    });
    const video = tile('v', {
      extra: {
        onSelectCommand: { watchEndpoint: { videoId: 'v', playlistId: 'RDv' } }
      }
    });
    assert.deepEqual(idsOf(parseFeed([mix, video, tile('a')])), ['v', 'a']);
  });

  it('hides poorly rated videos once their rating is cached', () => {
    configWrite('hideLowRated', '80');
    globalThis.localStorage.setItem(
      'ytaf-ratings',
      JSON.stringify({
        bad: [70, 30, Date.now()],
        good: [95, 5, Date.now()],
        few: [1, 9, Date.now()]
      })
    );
    const res = parseFeed([tile('bad'), tile('good'), tile('few'), tile('x')]);
    assert.deepEqual(idsOf(res), ['good', 'few', 'x']);
  });

  it('hides thumbnails and durations of spoiler-free channels', () => {
    configWrite('channelSettings', { 'Sports Club': { spoilerFree: true } });
    const res = parseFeed([
      withDuration('a', '1:30:00'),
      tile('b', {
        channel: 'Sports Club',
        extra: {
          header: {
            tileHeaderRenderer: {
              thumbnail: { thumbnails: [{ url: 'https://x/real.jpg' }] },
              thumbnailOverlays: [
                {
                  thumbnailOverlayTimeStatusRenderer: {
                    text: { simpleText: '2:10:00' }
                  }
                }
              ]
            }
          }
        }
      })
    ]);
    const [a, b] =
      res.contents.tvBrowseRenderer.content.sectionListRenderer.contents[0]
        .shelfRenderer.content.horizontalListRenderer.items;
    assert.equal(
      a.tileRenderer.header.tileHeaderRenderer.thumbnailOverlays.length,
      1
    );
    const header = b.tileRenderer.header.tileHeaderRenderer;
    assert.equal(header.thumbnailOverlays.length, 0);
    assert.match(header.thumbnail.thumbnails[0].url, /^data:image\/svg\+xml/);
  });

  it('hides videos older than the limit, in English and German', () => {
    configWrite('hideOlderThan', '180');
    const aged = (id, text) =>
      tile(id, {
        extra: {
          metadata: {
            tileMetadataRenderer: {
              title: { simpleText: id },
              lines: [
                {
                  lineRenderer: {
                    items: [
                      { lineItemRenderer: { text: { simpleText: text } } }
                    ]
                  }
                }
              ]
            }
          }
        }
      });
    const res = parseFeed([
      aged('a', '3 weeks ago'),
      aged('b', '2 years ago'),
      aged('c', 'vor 7 Monaten'),
      aged('d', 'vor 5 Monaten'),
      tile('e')
    ]);
    assert.deepEqual(idsOf(res), ['a', 'd', 'e']);
  });

  it('shows a repeated video only once per response', () => {
    configWrite('hideDuplicates', true);
    const res = parseFeed([tile('a'), tile('b'), tile('a')]);
    assert.deepEqual(idsOf(res), ['a', 'b']);
  });

  it('only counts YouTube responses in the timing stats', () => {
    const before = getParseStats().responses;
    JSON.parse('{"a":1}');
    parseFeed([tile('a')]);
    assert.equal(getParseStats().responses, before + 1);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { addWalkPass } = await import('../src/hooks/response-walker.ts');

const passes = { remove: null, tile: null, active: true };
addWalkPass('test', () =>
  passes.active
    ? {
        remove: (item) => passes.remove?.(item) ?? false,
        tile: (node) => passes.tile?.(node)
      }
    : null
);
addWalkPass('broken', () => {
  throw new Error('fails to start');
});

const feed = (items) =>
  JSON.parse(JSON.stringify({ contents: { list: items }, other: [1, 2] }));

describe('response walker', () => {
  it('removes matching entries from every array', () => {
    passes.remove = (item) => item?.drop === true;
    const res = feed([
      { drop: true },
      { keep: 1 },
      { nested: [{ drop: true }] }
    ]);
    assert.deepEqual(res.contents.list, [{ keep: 1 }, { nested: [] }]);
    passes.remove = null;
  });

  it('visits every tile once, also inside removed-entry neighbours', () => {
    const seen = [];
    passes.tile = (node) =>
      seen.push((node.tileRenderer ?? node.lockupViewModel).contentId);
    feed([
      { tileRenderer: { contentId: 'a' } },
      { shelf: { items: [{ lockupViewModel: { contentId: 'b' } }] } }
    ]);
    assert.deepEqual(seen, ['a', 'b']);
    passes.tile = null;
  });

  it('ignores responses that are not feeds', () => {
    let calls = 0;
    passes.remove = () => {
      calls++;
      return true;
    };
    const res = JSON.parse('{"list":[1,2,3]}');
    assert.deepEqual(res.list, [1, 2, 3]);
    assert.equal(calls, 0);
    passes.remove = null;
  });

  it('keeps working when a pass is turned off', () => {
    passes.active = false;
    passes.remove = () => true;
    const res = feed([{ a: 1 }]);
    assert.deepEqual(res.contents.list, [{ a: 1 }]);
    passes.active = true;
    passes.remove = null;
  });

  it('does not break JSON.parse when a tile handler throws', () => {
    passes.tile = () => {
      throw new Error('boom');
    };
    const res = feed([{ tileRenderer: { contentId: 'a' } }]);
    assert.equal(res.contents.list.length, 1);
    passes.tile = null;
  });
});

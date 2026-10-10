import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const config = await import('../src/config.js');

describe('config', () => {
  beforeEach(() => {
    config.configUseProfile(null);
    config.configResetAll();
    globalThis.localStorage.clear();
  });

  it('returns defaults until something is written', () => {
    assert.equal(config.configRead('enableAdBlock'), true);
    assert.equal(config.configGetDefault('removeShorts'), false);
    assert.deepEqual(config.configRead('blockedChannels'), []);
  });

  it('stores writes and tells listeners', () => {
    const events = [];
    config.configAddChangeListener('removeShorts', (evt) =>
      events.push(evt.detail)
    );
    config.configWrite('removeShorts', true);

    assert.equal(config.configRead('removeShorts'), true);
    assert.equal(
      JSON.parse(globalThis.localStorage.getItem('ytaf-configuration'))
        .removeShorts,
      true
    );
    assert.deepEqual(events.at(-1), {
      key: 'removeShorts',
      newValue: true,
      oldValue: false
    });
  });

  it('falls back to the default for unknown choice values', () => {
    config.configWrite('defaultPlaybackSpeed', 7);
    assert.equal(
      config.configRead('defaultPlaybackSpeed'),
      config.configGetDefault('defaultPlaybackSpeed')
    );
  });

  it('migrates boolean SponsorBlock categories', () => {
    config.configWrite('enableSponsorBlockSponsor', false);
    assert.equal(config.configRead('enableSponsorBlockSponsor'), 'show');
    config.configWrite('enableSponsorBlockSponsor', true);
    assert.equal(config.configRead('enableSponsorBlockSponsor'), 'skip');
  });

  it('rejects unknown keys', () => {
    assert.throws(() => config.configRead('noSuchOption'));
    assert.throws(() => config.configWrite('noSuchOption', 1));
  });

  describe('account profiles', () => {
    it('starts a new profile as a copy and keeps profiles apart', () => {
      config.configWrite('removeShorts', true);

      config.configUseProfile('first');
      assert.equal(config.configActiveProfile(), 'first');
      assert.equal(config.configRead('removeShorts'), true);
      config.configWrite('removeShorts', false);

      config.configUseProfile('second');
      assert.equal(config.configRead('removeShorts'), false);
      config.configWrite('hideLiveStreams', true);

      config.configUseProfile(null);
      assert.equal(config.configRead('removeShorts'), true);
      assert.equal(config.configRead('hideLiveStreams'), false);

      config.configUseProfile('second');
      assert.equal(config.configRead('hideLiveStreams'), true);
    });

    it('keeps per-TV options outside of profiles', () => {
      config.configWrite('perAccountSettings', true);
      config.configUseProfile('first');
      assert.equal(config.configRead('perAccountSettings'), true);
      config.configWrite('perAccountSettings', false);
      config.configUseProfile(null);
      assert.equal(config.configRead('perAccountSettings'), false);
    });

    it('tells listeners about values that differ between profiles', () => {
      config.configWrite('removeShorts', false);
      config.configUseProfile('first');
      config.configWrite('removeShorts', true);
      config.configUseProfile(null);

      const events = [];
      config.configAddChangeListener('removeShorts', (evt) =>
        events.push(evt.detail.newValue)
      );
      config.configUseProfile('first');
      assert.deepEqual(events, [true]);
    });
  });
});

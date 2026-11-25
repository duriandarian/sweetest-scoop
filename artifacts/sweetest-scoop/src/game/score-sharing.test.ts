import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyScoreRecap, scoreRecapText, scoreRecapUrl, shareScoreRecap } from './score-sharing';

test('the copied text shows the exact total and distinctive round emojis in chronological order', () => {
  assert.equal(scoreRecapText({ totalPoints: 330, rounds: [
    'mango-cube', 'skipped', 'sago-pearl', 'pomelo-gem', 'coconut-cloud', 'golden-mango',
  ] }), 'The Sweetest Scoop 🧋\n330\n\n🥭 ➖ 🫧 🍊 🥥 👑\n\nTopping key: 👑 Golden Mango · 🥥 Coconut Cloud · 🍊 Pomelo Gem · 🥭 Mango Cube · 🫧 Sago Pearl · ➖ No scored answer');
  assert.equal(scoreRecapText({ totalPoints: 0, rounds: ['skipped', 'skipped'] }),
    'The Sweetest Scoop 🧋\n0\n\n➖ ➖\n\nTopping key: ➖ No scored answer');
});

test('share URLs follow the mounted base and only pass the reference in the fragment', () => {
  assert.equal(scoreRecapUrl('/', 'https://example.test', 'opaque'), 'https://example.test/results#opaque');
  assert.equal(scoreRecapUrl('/game/', 'https://example.test', 'opaque'), 'https://example.test/game/results#opaque');
});

test('native sharing sends the recap with its link and does not prompt again if cancelled', async () => {
  const result = await shareScoreRecap({ share: async data => {
    assert.deepEqual(data, { title: 'The Sweetest Scoop 🧋', text: 'recap', url: 'https://example.test' });
  } }, 'recap', 'https://example.test');
  assert.equal(result, 'shared');
  assert.equal(await shareScoreRecap({
    share: async () => { throw new DOMException('Cancelled by guest', 'AbortError'); },
    clipboard: { writeText: async () => assert.fail('Cancelling should not silently copy') },
  }, 'recap', 'https://example.test'), 'cancelled');
});

test('an unavailable or blocked share still has clipboard and manual fallbacks', async () => {
  let copied = '';
  const clipboard = { writeText: async (text: string) => { copied = text; } };
  assert.equal(await shareScoreRecap({ clipboard }, 'recap', 'https://example.test'), 'copied');
  assert.equal(copied, 'recap\n\nhttps://example.test');
  const blockedShare = async () => { throw new DOMException('Blocked by embed', 'NotAllowedError'); };
  assert.equal(await shareScoreRecap({ share: blockedShare, clipboard }, 'recap', 'https://example.test'), 'copied');
  assert.equal(await copyScoreRecap({}, 'recap', 'https://example.test'), 'manual');
  assert.equal(await copyScoreRecap({ clipboard: { writeText: blockedShare } },
    'recap', 'https://example.test'), 'manual');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  WARDROBE_ACCESSORIES, WARDROBE_COLORS, WARDROBE_HATS, WARDROBE_OUTFITS,
  DEFAULT_LOOK, EMPTY_LOOK, decodeAvatar, encodeAvatar, isLegacyAvatar, lookOf, randomLook,
} from './wardrobe';

test('every wardrobe combination has a unique, reversible compact token', () => {
  const tokens = new Set<string>();
  assert.deepEqual([WARDROBE_COLORS.length, WARDROBE_HATS.length, WARDROBE_OUTFITS.length, WARDROBE_ACCESSORIES.length], [6, 14, 12, 12]);
  for (const color of WARDROBE_COLORS)
    for (const hat of WARDROBE_HATS)
      for (const outfit of WARDROBE_OUTFITS)
        for (const accessory of WARDROBE_ACCESSORIES) {
          const look = { color, hat, outfit, accessory };
          const token = encodeAvatar(look);
          assert.match(token, /^b1:[0-5]:([0-9]|1[0-3]):([0-9]|1[01]):([0-9]|1[01])$/);
          assert.deepEqual(decodeAvatar(token), look);
          tokens.add(token);
        }
  assert.equal(tokens.size, 12096);
  assert.equal(encodeAvatar(DEFAULT_LOOK), 'b1:0:2:1:1');
  assert.equal(encodeAvatar(EMPTY_LOOK), 'b1:0:0:0:0');
  assert.deepEqual(decodeAvatar('b1:0:8:6:7'), { color: 'mango', hat: 'beanie', outfit: 'bee', accessory: 'sparkles' });
  assert.deepEqual(decodeAvatar('b1:5:13:11:11'), { color: 'brown-sugar', hat: 'pirate', outfit: 'superhero', accessory: 'headphones' });
});

test('legacy presets remain separate and malformed appearances never decode', () => {
  for (const id of ['mango', 'matcha', 'strawberry', 'taro', 'coconut']) {
    assert.ok(isLegacyAvatar(id));
    assert.equal(decodeAvatar(id), null);
    assert.equal(lookOf(id).color, id);
  }
  for (const token of ['', 'b2:0:0:0:0', 'b1:6:0:0:0', 'b1:0:14:0:0', 'b1:0:0:12:0', 'b1:0:0:0:12', 'b1:0:0:0:0\n', 'b1:00:0:0:0', 'b1:0:01:0:0', 'b1:0:0:00:0', 'b1:0:0:0:01', 'b1:0:0:0:0:1'])
    assert.equal(decodeAvatar(token), null);
});

test('surprise choices always encode into valid, fully rendered combinations', () => {
  for (const n of [0, .1, .25, .5, .75, .999999])
    assert.deepEqual(decodeAvatar(encodeAvatar(randomLook(() => n))), randomLook(() => n));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BODY_TINTS } from './theme';
import {
  WARDROBE_ACCESSORIES, WARDROBE_COLORS, WARDROBE_HATS, WARDROBE_LABELS, WARDROBE_OUTFITS,
  DEFAULT_LOOK, EMPTY_LOOK, decodeAvatar, encodeAvatar, isLegacyAvatar, lookOf, randomLook,
} from './wardrobe';

test('every wardrobe combination has a unique, reversible compact token', () => {
  const tokens = new Set<string>();
  assert.deepEqual([WARDROBE_COLORS.length, WARDROBE_HATS.length, WARDROBE_OUTFITS.length, WARDROBE_ACCESSORIES.length], [12, 22, 24, 14]);
  for (const color of WARDROBE_COLORS)
    for (const hat of WARDROBE_HATS)
      for (const outfit of WARDROBE_OUTFITS)
        for (const accessory of WARDROBE_ACCESSORIES) {
          const look = { color, hat, outfit, accessory };
          const token = encodeAvatar(look);
          assert.ok(token.length <= 16);
          assert.deepEqual(decodeAvatar(token), look);
          tokens.add(token);
        }
  assert.equal(tokens.size, 88704);
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
  for (const token of ['', 'b2:0:0:0:0', 'b1:12:0:0:0', 'b1:0:22:0:0', 'b1:0:0:24:0', 'b1:0:0:0:14', 'b1:0:0:0:0\n', 'b1:00:0:0:0', 'b1:0:01:0:0', 'b1:0:0:00:0', 'b1:0:0:0:01', 'b1:0:0:0:0:1'])
    assert.equal(decodeAvatar(token), null);
});

test('new choices are append-only so all old saved wardrobe indices keep their meaning', () => {
  assert.deepEqual(WARDROBE_COLORS.slice(0, 6), ['mango', 'matcha', 'strawberry', 'taro', 'coconut', 'brown-sugar']);
  assert.deepEqual(WARDROBE_HATS.slice(0, 14),
    ['none', 'beret', 'bow', 'flower', 'cat', 'frog', 'crown', 'chef', 'beanie', 'bunny', 'bear', 'panda', 'mushroom', 'pirate']);
  assert.deepEqual(WARDROBE_OUTFITS.slice(0, 12),
    ['none', 'apron', 'overalls', 'scarf', 'sweater', 'kimono', 'bee', 'dinosaur', 'astronaut', 'fox', 'duck', 'superhero']);
  assert.deepEqual(decodeAvatar('b1:5:21:23:11'),
    { color: 'brown-sugar', hat: 'sleepcap', outfit: 'pajamas', accessory: 'headphones' });
  assert.equal(encodeAvatar({ ...DEFAULT_LOOK, accessory: 'schnauzer' }), 'b1:0:2:1:12');
  assert.equal(encodeAvatar({ ...DEFAULT_LOOK, accessory: 'turtle' }), 'b1:0:2:1:13');
  assert.deepEqual(decodeAvatar('b1:11:21:23:13'),
    { color: 'black-sesame', hat: 'sleepcap', outfit: 'pajamas', accessory: 'turtle' });
});

test('surprise choices always encode into valid, fully rendered combinations', () => {
  for (const n of [0, .1, .25, .5, .75, .999999])
    assert.deepEqual(decodeAvatar(encodeAvatar(randomLook(() => n))), randomLook(() => n));
});

test('all body colors have their own swatches, tints, and accessible names', () => {
  const tints = WARDROBE_COLORS.map(color => BODY_TINTS[color]);
  const names = WARDROBE_COLORS.map(color => WARDROBE_LABELS[color]);
  assert.ok(names.every(Boolean));
  assert.equal(new Set(names).size, WARDROBE_COLORS.length);
  assert.equal(new Set(tints.map(tint => tint.swatch)).size, WARDROBE_COLORS.length);
  assert.equal(new Set(tints.map(tint => tint.filter)).size, WARDROBE_COLORS.length);
});

// Pure wardrobe model. Order of every list is PERSISTED in avatar tokens — never reorder, only append.
export const WARDROBE_COLORS = ['mango', 'matcha', 'strawberry', 'taro', 'coconut', 'brown-sugar'] as const;
export const WARDROBE_HATS = ['none', 'beret', 'bow', 'flower', 'cat', 'frog', 'crown', 'chef', 'beanie', 'bunny', 'bear', 'panda', 'mushroom', 'pirate'] as const;
export const WARDROBE_OUTFITS = ['none', 'apron', 'overalls', 'scarf', 'sweater', 'kimono', 'bee', 'dinosaur', 'astronaut', 'fox', 'duck', 'superhero'] as const;
export const WARDROBE_ACCESSORIES = ['none', 'tea', 'heart', 'star', 'mango', 'glasses', 'blush', 'sparkles', 'donut', 'umbrella', 'guitar', 'headphones'] as const;

export type WardrobeColor = typeof WARDROBE_COLORS[number];
export type WardrobeHat = typeof WARDROBE_HATS[number];
export type WardrobeOutfit = typeof WARDROBE_OUTFITS[number];
export type WardrobeAccessory = typeof WARDROBE_ACCESSORIES[number];
export type WardrobeLook = { color: WardrobeColor; hat: WardrobeHat; outfit: WardrobeOutfit; accessory: WardrobeAccessory };

export const LEGACY_AVATARS = ['mango', 'matcha', 'strawberry', 'taro', 'coconut'] as const;
export const isLegacyAvatar = (s?: string | null): s is typeof LEGACY_AVATARS[number] => !!s && (LEGACY_AVATARS as readonly string[]).includes(s);

export const EMPTY_LOOK: WardrobeLook = { color: 'mango', hat: 'none', outfit: 'none', accessory: 'none' };
export const DEFAULT_LOOK: WardrobeLook = { color: 'mango', hat: 'bow', outfit: 'apron', accessory: 'tea' };

/** encodeAvatar({color,hat,outfit,accessory}) -> "b1:C:H:O:A" (base-10 indices into the arrays). */
export function encodeAvatar(look: WardrobeLook): string {
  const i = [WARDROBE_COLORS.indexOf(look.color), WARDROBE_HATS.indexOf(look.hat), WARDROBE_OUTFITS.indexOf(look.outfit), WARDROBE_ACCESSORIES.indexOf(look.accessory)];
  if (i.some(n => n < 0)) throw new Error('Unknown wardrobe item');
  return `b1:${i.join(':')}`;
}

/** decodeAvatar("b1:C:H:O:A") — indices are base-10 without leading zeros, bounds-checked against the arrays -> WardrobeLook, or null when not a valid custom token (legacy ids return null). */
export function decodeAvatar(token?: string | null): WardrobeLook | null {
  if (typeof token !== 'string' || token.length > 16) return null;
  const m = /^b1:(0|[1-9]\d*):(0|[1-9]\d*):(0|[1-9]\d*):(0|[1-9]\d*)$/.exec(token);
  if (!m || m[0] !== token) return null;
  const [c, h, o, a] = m.slice(1).map(Number);
  const color = WARDROBE_COLORS[c], hat = WARDROBE_HATS[h], outfit = WARDROBE_OUTFITS[o], accessory = WARDROBE_ACCESSORIES[a];
  if (!color || !hat || !outfit || !accessory) return null;
  return { color, hat, outfit, accessory };
}

/** Best-effort look for any avatar string: custom token, legacy id (color only), else mango. */
export function lookOf(avatar?: string | null): WardrobeLook {
  const d = decodeAvatar(avatar);
  if (d) return d;
  if (isLegacyAvatar(avatar)) return { ...EMPTY_LOOK, color: avatar };
  return EMPTY_LOOK;
}

export function randomLook(rand: () => number = Math.random): WardrobeLook {
  const pick = <T,>(l: readonly T[]) => l[Math.floor(rand() * l.length)];
  return { color: pick(WARDROBE_COLORS), hat: pick(WARDROBE_HATS), outfit: pick(WARDROBE_OUTFITS), accessory: pick(WARDROBE_ACCESSORIES) };
}

export const WARDROBE_LABELS: Record<string, string> = {
  none: 'None', mango: 'Mango', matcha: 'Matcha', strawberry: 'Strawberry', taro: 'Taro', coconut: 'Coconut', 'brown-sugar': 'Brown sugar',
  beret: 'Beret', bow: 'Ribbon bow', flower: 'Plumeria', cat: 'Cat ears', frog: 'Frog hood', crown: 'Mini crown', chef: 'Chef toque', beanie: 'Pom beanie',
  apron: 'Café apron', overalls: 'Overalls', scarf: 'Knit scarf', sweater: 'Cozy sweater', kimono: 'Yukata', bee: 'Bee suit',
  tea: 'Mango sago cup', bunny: 'Bunny ears', bear: 'Bear ears', panda: 'Panda hood', mushroom: 'Mushroom cap', pirate: 'Pirate hat', dinosaur: 'Dinosaur suit', astronaut: 'Astronaut suit', fox: 'Fox suit', duck: 'Duckling suit', superhero: 'Hero cape', donut: 'Donut', umbrella: 'Paper parasol', guitar: 'Ukulele', headphones: 'Headphones', heart: 'Heart balloon', star: 'Star wand', glasses: 'Round glasses', blush: 'Rosy blush', sparkles: 'Sparkles',
};
export const lookLabel = (l: WardrobeLook) => [WARDROBE_LABELS[l.color], l.hat, l.outfit, l.accessory].filter(x => x && x !== 'none').map(x => WARDROBE_LABELS[x] ?? x).join(', ');

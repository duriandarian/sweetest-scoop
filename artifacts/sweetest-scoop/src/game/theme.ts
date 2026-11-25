import type { RoomState } from '@workspace/api-client-react';
import type { WardrobeColor } from './wardrobe';

export const GAME_TITLE = 'The Sweetest Scoop';

/** Legacy flavor id or custom "b1:C:H:O:A" token. */
export type AvatarId = string;
export type LegacyAvatar = { id: string; label: string; note: string; hue: number; sat: number; aura: string; ink: string };
export const AVATARS: LegacyAvatar[] = [
  { id: 'mango', label: 'Mango', note: 'golden glaze, leaf sprig', hue: 0, sat: 1, aura: '#f6c45a', ink: '#8a5a12' },
  { id: 'matcha', label: 'Matcha', note: 'whisked green, tea leaf', hue: 70, sat: 0.9, aura: '#9fbf7a', ink: '#3f5a2a' },
  { id: 'strawberry', label: 'Strawberry', note: 'blush pink, tiny seeds', hue: -35, sat: 1.15, aura: '#ec8f9c', ink: '#8b3a47' },
  { id: 'taro', label: 'Taro', note: 'lilac cream, blossom', hue: 230, sat: 0.8, aura: '#b9a1d6', ink: '#5a4479' },
  { id: 'coconut', label: 'Coconut', note: 'milky cloud, shell crown', hue: 10, sat: 0.35, aura: '#ece0c8', ink: '#6b5a44' },
];
export const avatarOf = (id?: string | null) => AVATARS.find(a => a.id === id) ?? AVATARS[0];

/** Body tint per wardrobe color: filter applies to the base sprite only. */
export const BODY_TINTS: Record<WardrobeColor, { filter: string; aura: string; swatch: string }> = {
  mango: { filter: 'none', aura: '#f6c45a', swatch: '#f2bd55' },
  matcha: { filter: 'hue-rotate(62deg) saturate(.85)', aura: '#9fbf7a', swatch: '#a9c27f' },
  strawberry: { filter: 'hue-rotate(-32deg) saturate(1.15)', aura: '#ec8f9c', swatch: '#ec9aa4' },
  taro: { filter: 'hue-rotate(225deg) saturate(.75)', aura: '#b9a1d6', swatch: '#c1aade' },
  coconut: { filter: 'saturate(.3) brightness(1.08)', aura: '#ece0c8', swatch: '#efe5d0' },
  'brown-sugar': { filter: 'sepia(.45) saturate(1.3) brightness(.82)', aura: '#c48a55', swatch: '#b9814f' },
  blueberry: { filter: 'hue-rotate(177deg) saturate(1.12) brightness(.96)', aura: '#9bcdeb', swatch: '#74b5ef' },
  mint: { filter: 'hue-rotate(113deg) saturate(.85) brightness(1.08)', aura: '#9ee0bf', swatch: '#7cdab1' },
  lemon: { filter: 'hue-rotate(27deg) saturate(1.45) brightness(1.14)', aura: '#efe285', swatch: '#e9d94c' },
  peach: { filter: 'hue-rotate(-12deg) saturate(.74) brightness(1.20)', aura: '#f9c4a1', swatch: '#f6c0a0' },
  cherry: { filter: 'hue-rotate(-56deg) saturate(1.45) brightness(.72) contrast(1.12)', aura: '#e092a3', swatch: '#e26080' },
  'black-sesame': { filter: 'hue-rotate(195deg) saturate(.12) brightness(.74) contrast(1.14)', aura: '#c9c6d1', swatch: '#848996' },
};

export const PRIZES = [
  { name: 'Sago Pearl', depth: 0, base: 20, color: '#efe4cf', ink: '#7a6a52', blurb: 'common or too clever' },
  { name: 'Mango Cube', depth: 1, base: 40, color: '#f5c35b', ink: '#7c5410' },
  { name: 'Pomelo Gem', depth: 2, base: 60, color: '#f2a59a', ink: '#8a3f37' },
  { name: 'Coconut Cloud', depth: 3, base: 80, color: '#afd397', ink: '#284c31' },
  { name: 'Golden Mango', depth: 4, base: 100, color: '#e89545', ink: '#753913' },
] as const;
export type PrizeName = typeof PRIZES[number]['name'];

const TIER_MAP: Record<string, PrizeName> = {
  plankton: 'Sago Pearl', 'too clever': 'Sago Pearl', schooler: 'Mango Cube', rare: 'Pomelo Gem', 'deep cut': 'Coconut Cloud', krillion: 'Golden Mango',
};
export function prizeFor(tier?: string | null, depth?: number | null) {
  const key = (tier ?? '').trim().toLowerCase();
  const byName = PRIZES.find(p => p.name.toLowerCase() === key);
  if (byName) return byName;
  const mapped = TIER_MAP[key];
  if (mapped) return PRIZES.find(p => p.name === mapped)!;
  return PRIZES[Math.max(0, Math.min(4, depth ?? 0))];
}

export type Room = RoomState & { submitted?: boolean; submittedCount?: number };
export type PlayerLike = { id: string; displayName: string; isHost: boolean; avatar?: string };

export const fmtSecs = (ms?: number | null) => (ms == null ? '--' : `${(ms / 1000).toFixed(1)}s`);
export const sessionKey = (code: string) => `sweetest-scoop:${code}`;

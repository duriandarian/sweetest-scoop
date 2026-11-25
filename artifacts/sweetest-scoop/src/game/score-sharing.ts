import type { RecapOutcome, ScoreRecap } from '@workspace/api-client-react';
import type { IngredientKind } from './IngredientArt';
import { GAME_TITLE } from './theme';

export const RECAP_TITLE = `${GAME_TITLE} 🧋`;

export const recapToppings: Record<RecapOutcome, { emoji: string; label: string; kind: IngredientKind | null }> = {
  'golden-mango': { emoji: '👑', label: 'Golden Mango', kind: 'gold' },
  'coconut-cloud': { emoji: '🥥', label: 'Coconut Cloud', kind: 'cloud' },
  'pomelo-gem': { emoji: '🍊', label: 'Pomelo Gem', kind: 'pomelo' },
  'mango-cube': { emoji: '🥭', label: 'Mango Cube', kind: 'cube' },
  'sago-pearl': { emoji: '🫧', label: 'Sago Pearl', kind: 'sago' },
  skipped: { emoji: '➖', label: 'No scored answer', kind: null },
};

export function recapKey(rounds: readonly RecapOutcome[]) {
  const used = new Set<string>(rounds);
  return Object.entries(recapToppings).filter(([outcome]) => used.has(outcome));
}

export function scoreRecapText(recap: ScoreRecap) {
  const strip = recap.rounds.map(round => recapToppings[round].emoji).join(' ');
  const key = recapKey(recap.rounds).map(([, { emoji, label }]) => `${emoji} ${label}`).join(' · ');
  return [`${RECAP_TITLE}\n${recap.totalPoints}`, strip, key && `Topping key: ${key}`].filter(Boolean).join('\n\n');
}

export function scoreRecapUrl(base: string, origin: string, reference: string) {
  // Fragments are not sent in navigation requests or HTTP referrers.
  const url = new URL(`${base.replace(/\/$/, '')}/results`, origin);
  url.hash = reference;
  return url.href;
}

type ShareDevice = Partial<Pick<Navigator, 'share'>> & { clipboard?: Pick<Clipboard, 'writeText'> };

export async function copyScoreRecap(device: ShareDevice, text: string, url: string) {
  try {
    if (!device.clipboard) return 'manual';
    await device.clipboard.writeText(`${text}\n\n${url}`);
    return 'copied';
  } catch {
    return 'manual';
  }
}

export async function shareScoreRecap(device: ShareDevice, text: string, url: string) {
  if (typeof device.share !== 'function') return copyScoreRecap(device, text, url);
  try {
    await device.share({ title: RECAP_TITLE, text, url });
    return 'shared';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    return copyScoreRecap(device, text, url);
  }
}

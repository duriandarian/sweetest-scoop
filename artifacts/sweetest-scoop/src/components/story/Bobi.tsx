/* Bobi: the exact character from the user's uploaded reference image (transparent asset), used as a tutorial nickname only. */
const base = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/').replace(/\/$/, '');
export const BOBI_SRC = `${base}/story/bobi-reference.webp`;
export type BobiMood = 'wave' | 'guide' | 'cheer';

export function Bobi({ mood = 'guide', className = '' }: { mood?: BobiMood; className?: string }) {
  return <img className={`bobi bobi-${mood} ${className}`} src={BOBI_SRC} alt="Bobi, our little guide" draggable={false} data-testid="img-bobi"/>;
}

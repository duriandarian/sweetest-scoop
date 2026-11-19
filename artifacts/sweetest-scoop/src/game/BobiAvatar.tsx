import { BOBI_SRC } from '@/components/story/Bobi';
import { avatarOf, BODY_TINTS } from './theme';
import { decodeAvatar, lookLabel } from './wardrobe';
import { AccessoryArt, BackArt, HatArt, OutfitArt } from './WardrobeArt';
import './wardrobe.css';

export const BOBI_DRESSUP_SRC = `${import.meta.env.BASE_URL}story/bobi-dressup-base.webp`;

function Accessory({ id, ink }: { id: string; ink: string }) {
  if (id === 'matcha') return <svg viewBox="0 0 40 40"><path d="M8 30C10 14 22 6 34 6c-2 14-12 24-26 24Z" fill="#8fb36a" stroke={ink} strokeWidth="2"/><path d="M10 29 30 9" stroke={ink} strokeWidth="1.6"/></svg>;
  if (id === 'strawberry') return <svg viewBox="0 0 40 40"><path d="M20 36C8 28 6 16 12 12c4-2 6 0 8 2 2-2 4-4 8-2 6 4 4 16-8 24Z" fill="#e66a7c" stroke={ink} strokeWidth="2"/><path d="M13 10l7 4 7-4-3-4-4 3-4-3Z" fill="#7fae5c" stroke={ink} strokeWidth="1.5"/><circle cx="16" cy="20" r="1.2" fill="#fff3c8"/><circle cx="24" cy="21" r="1.2" fill="#fff3c8"/><circle cx="20" cy="27" r="1.2" fill="#fff3c8"/></svg>;
  if (id === 'taro') return <svg viewBox="0 0 40 40">{[0, 72, 144, 216, 288].map(r => <ellipse key={r} cx="20" cy="11" rx="5" ry="8" fill="#c9b2e4" stroke={ink} strokeWidth="1.5" transform={`rotate(${r} 20 20)`}/>)}<circle cx="20" cy="20" r="4" fill="#f4d27a" stroke={ink} strokeWidth="1.5"/></svg>;
  if (id === 'coconut') return <svg viewBox="0 0 40 40"><path d="M4 24a16 16 0 0 1 32 0Z" fill="#8a6446" stroke={ink} strokeWidth="2"/><path d="M8 24a12 12 0 0 1 24 0Z" fill="#fbf5e8"/></svg>;
  return <svg viewBox="0 0 40 40"><path d="M20 34c-9 0-14-7-12-15 2-7 10-9 16-6 7 3 9 10 6 15-2 4-6 6-10 6Z" fill="#f5b740" stroke={ink} strokeWidth="2"/><path d="M22 12c2-6 8-8 12-7-1 5-6 8-12 7Z" fill="#7fae5c" stroke={ink} strokeWidth="1.6"/></svg>;
}

/** Shared renderer for every Bobi in the game: legacy flavor ids render unchanged; b1 tokens render the dress-up stack. */
/** `label` is accepted for compatibility but no visible name is rendered. */
export function BobiAvatar({ avatar, size = 56, className = '', testId }: { avatar?: string | null; size?: number; label?: boolean; className?: string; testId?: string }) {
  const look = decodeAvatar(avatar);
  if (look) {
    const tint = BODY_TINTS[look.color];
    const name = lookLabel(look);
    return <span className={`bobi-av bobi-dress ${className}`} style={{ ['--av' as string]: `${size}px`, ['--aura' as string]: tint.aura }} data-testid={testId} role="img" aria-label={`Bobi wearing ${name || 'nothing extra'}`}>
      <span className="bobi-av-aura" aria-hidden="true"/>
      <span className="bobi-dress-stage" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="bobi-dress-layers is-back"><BackArt outfit={look.outfit}/></svg>
        <img src={BOBI_DRESSUP_SRC} alt="" draggable={false} style={{ filter: tint.filter }}/>
        <svg viewBox="0 0 100 100" className="bobi-dress-layers">
          <OutfitArt id={look.outfit}/>
          <HatArt id={look.hat}/>
          <AccessoryArt id={look.accessory}/>
        </svg>
      </span>
    </span>;
  }
  const a = avatarOf(avatar);
  return <span className={`bobi-av ${className}`} style={{ ['--av' as string]: `${size}px`, ['--aura' as string]: a.aura }} data-testid={testId}>
    <span className="bobi-av-aura" aria-hidden="true"/>
    <img src={BOBI_SRC} alt={`Bobi, ${a.label} style`} draggable={false} style={{ filter: `hue-rotate(${a.hue}deg) saturate(${a.sat})` }}/>
    <span className="bobi-av-acc" aria-hidden="true"><Accessory id={a.id} ink={a.ink}/></span>
  </span>;
}

import { useState } from 'react';
import { Ban, RotateCcw, Shuffle } from 'lucide-react';
import { BobiAvatar } from './BobiAvatar';
import { BODY_TINTS } from './theme';
import {
  EMPTY_LOOK, WARDROBE_ACCESSORIES, WARDROBE_COLORS, WARDROBE_HATS, WARDROBE_LABELS, WARDROBE_OUTFITS,
  encodeAvatar, lookLabel, lookOf, randomLook, type WardrobeLook,
} from './wardrobe';

type Cat = 'color' | 'hat' | 'outfit' | 'accessory';
const CATS: { id: Cat; label: string; items: readonly string[] }[] = [
  { id: 'hat', label: 'Hats', items: WARDROBE_HATS },
  { id: 'outfit', label: 'Outfits', items: WARDROBE_OUTFITS },
  { id: 'accessory', label: 'Extras', items: ['none', 'schnauzer', 'turtle', ...WARDROBE_ACCESSORIES.filter(item => item !== 'none' && item !== 'schnauzer' && item !== 'turtle')] },
  { id: 'color', label: 'Color', items: WARDROBE_COLORS },
];

/**
 * Wardrobe picker. `onPick` receives an encoded avatar token. In forms it updates local preview;
 * in the lobby it triggers the real profile mutation (disabled while `busy`).
 */
export function Wardrobe({ value, onPick, busy = false, status, compact = false }: { value?: string | null; onPick: (token: string) => void; busy?: boolean; status?: string; compact?: boolean }) {
  const [cat, setCat] = useState<Cat>('hat');
  const look = lookOf(value);
  const set = (patch: Partial<WardrobeLook>) => { if (!busy) onPick(encodeAvatar({ ...look, ...patch })); };
  const active = CATS.find(c => c.id === cat)!;
  const tabId = (c: Cat) => `wardrobe-tab-${c}`;

  return <div className={`wardrobe ${compact ? 'is-compact' : ''} ${busy ? 'is-busy' : ''}`} data-testid="wardrobe">
    <div className="wd-stage">
      <div className="wd-stage-bobi" key={value ?? 'none'}><BobiAvatar avatar={encodeAvatar(look)} size={compact ? 116 : 150} testId="img-wardrobe-preview"/></div>
      <div className="wd-stage-copy">
        <p className="wd-stage-kicker">Fitting room</p>
        <p className="wd-stage-name" data-testid="text-wardrobe-look"><span className="sr-only">{lookLabel(look) || 'Just Bobi'}</span><span aria-hidden="true">Your Bobi</span></p>
        <div className="wd-stage-actions">
          <button type="button" className="wd-ghost" disabled={busy} onClick={() => onPick(encodeAvatar(randomLook()))} data-testid="button-wardrobe-randomize"><Shuffle size={13}/> Surprise me</button>
          <button type="button" className="wd-ghost" disabled={busy} onClick={() => set({ hat: EMPTY_LOOK.hat, outfit: EMPTY_LOOK.outfit, accessory: EMPTY_LOOK.accessory })} data-testid="button-wardrobe-reset"><RotateCcw size={13}/> Clear</button>
        </div>
        {status && <p className="wd-status" aria-live="polite" data-testid="status-wardrobe">{status}</p>}
      </div>
    </div>

    <div className="wd-tabs" role="tablist" aria-label="Wardrobe categories">
      {CATS.map(c => <button key={c.id} type="button" role="tab" id={tabId(c.id)} aria-selected={cat === c.id} aria-controls="wardrobe-panel" className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)} data-testid={`tab-wardrobe-${c.id}`}>{c.label}</button>)}
    </div>

    <div id="wardrobe-panel" role="radiogroup" aria-labelledby={tabId(cat)} className={`wd-grid wd-grid-${cat}`}>
      {active.items.map(item => {
        const on = look[cat] === item;
        const preview = encodeAvatar({ ...look, [cat]: item } as WardrobeLook);
        return <button key={item} type="button" role="radio" aria-checked={on} aria-label={item === 'none' ? `No ${active.label.toLowerCase().replace(/s$/, '')}` : WARDROBE_LABELS[item]} disabled={busy} className={`wd-tile ${on ? 'on' : ''}`} onClick={() => set({ [cat]: item } as Partial<WardrobeLook>)} data-testid={`button-wardrobe-${cat}-${item}`}>
          {cat === 'color' && <i className="wd-swatch" style={{ background: BODY_TINTS[item as WardrobeLook['color']].swatch }}/>}
          <BobiAvatar avatar={preview} size={compact ? 50 : 56}/>
          {item === 'none' && <Ban className="wd-none" size={14} aria-hidden="true"/>}
        </button>;
      })}
    </div>
  </div>;
}

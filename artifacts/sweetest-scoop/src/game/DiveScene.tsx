import type { ReactNode } from 'react';
import { BobiAvatar } from './BobiAvatar';
import './dive-scene.css';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const CUP_SRC = `${base}/story/watercolor-mango-sago.webp`;

/*
 * World coordinates are in cqh of the scene viewport (1cqh = 1% of visible height).
 * The surface sits at SURFACE. Each reward band is BAND below the previous one, so
 * at rest only the surface and a sliver of liquid are visible; deeper bands are offscreen.
 */
const SURFACE = 20;
const BAND = 70;
const FOCUS = 46; // where the camera holds Bobi on screen
export const WORLD = 440;
export const depthY = (d: number | null) => (d == null || d < 0 ? SURFACE - 1 : SURFACE + BAND * (d + 1));
export const depthCm = (d: number) => (d + 1) * 20;

type Bit = readonly [x: number, dy: number, r: number, s: number];
const BANDS: { kind: string; bits: Bit[] }[] = [
  { kind: 'sago', bits: [[7, -14, 0, 1], [12, -6, 0, .8], [17, -16, 0, 1.2], [84, -10, 0, 1], [90, -2, 0, .8], [79, 4, 0, 1.1], [24, 8, 0, .9], [70, -18, 0, .7]] },
  { kind: 'cube', bits: [[9, -10, -14, 1], [19, 6, 22, .8], [82, -6, 12, 1.1], [91, 10, -24, .8], [74, 14, 35, .7]] },
  { kind: 'pomelo', bits: [[8, -8, -30, 1], [14, 4, 18, .9], [22, -14, 70, 1], [80, -12, -12, 1], [88, 2, 40, .9], [93, -18, 110, .8]] },
  { kind: 'cloud', bits: [[10, -6, 0, 1], [86, 6, 0, .9], [24, 14, 0, .6]] },
  { kind: 'gold', bits: [[11, 2, -16, 1], [87, -6, 20, .9]] },
];
const AMBIENT: Bit[] = [[30, 40, 0, .7], [66, 58, 0, .6], [40, 120, 0, .8], [58, 175, 0, .6], [34, 245, 0, .7], [63, 300, 0, .8], [45, 352, 0, .6], [28, 395, 0, .7]];
const DRIFT = [[14, 0], [33, 2.1], [61, 3.6], [77, 1.2], [88, 4.4]] as const;
const TICKS = Array.from({ length: 11 }, (_, i) => i + 1);

/** depth: null = waiting at the surface, -1 = no prize (floats back), 0..4 = reward band */
export function DiveScene({ avatar, depth, caption, compact = false, children }: { avatar?: string | null; depth: number | null; caption?: string; compact?: boolean; children?: ReactNode }) {
  const landed = depth != null && depth >= 0;
  const size = compact ? 76 : 88;
  const y = depthY(depth);
  const cam = Math.max(0, y - FOCUS);
  return <div className={`dive ds ${compact ? 'is-compact' : ''} ${landed ? 'is-landed' : ''} ${depth != null ? 'is-diving' : ''}`} data-testid="scene-dive">
    <div className="ds-world" style={{ transform: `translate3d(0, ${-cam}cqh, 0)` }}>
      <div className="ds-sky" aria-hidden="true"><i className="ds-sun"/></div>
      <div className="ds-rays" aria-hidden="true"><i/><i/><i/></div>
      <div className="ds-ticks" aria-hidden="true">{TICKS.map(t => <span key={t} style={{ top: `${SURFACE + t * 35}cqh` }}>{t * 10}</span>)}</div>
      <div className="ds-decor" aria-hidden="true">
        {AMBIENT.map(([x, t, , s], i) => <span key={`a${i}`} className="ds-sago" style={{ left: `${x}%`, top: `${SURFACE + t}cqh`, ['--s' as string]: s, animationDelay: `${-i * .9}s` }}/>)}
        {BANDS.map((b, d) => <div key={b.kind} className={`ds-band ${landed && depth === d ? 'is-found' : ''}`}>
          {b.bits.map(([x, dy, r, s], i) => <span key={i} className={`ds-${b.kind}`} style={{ left: `${x}%`, top: `${depthY(d) + dy}cqh`, ['--r' as string]: `${r}deg`, ['--s' as string]: s, animationDelay: `${-(i + d) * .8}s` }}/>)}
          <span className={`ds-prize ds-${b.kind}`} style={{ top: `calc(${depthY(d)}cqh + ${size * .42}px)` }}/>
        </div>)}
        <span className="ds-floor" style={{ top: `${WORLD - 26}cqh` }}/>
      </div>
      <div className="ds-surface" style={{ top: `${SURFACE}cqh` }} aria-hidden="true"/>
      {children && <div className="ds-prompt" style={{ top: `calc(${SURFACE}cqh + ${size / 2 + 14}px)` }}>{children}</div>}
      <div className="dive-bobi" style={{ transform: `translate3d(-50%, calc(${y}cqh - 50%), 0)` }}>
        <BobiAvatar avatar={avatar} size={size}/>
      </div>
    </div>
    <div className="ds-bubbles" aria-hidden="true">{DRIFT.map(([x, d], i) => <i key={i} style={{ left: `${x}%`, animationDelay: `${-d}s` }}/>)}</div>
    <div className="ds-vignette" aria-hidden="true"/>
    {caption && <p className="dive-caption">{caption}</p>}
  </div>;
}

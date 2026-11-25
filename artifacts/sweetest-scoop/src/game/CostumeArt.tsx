import type { WardrobeHat, WardrobeOutfit } from './wardrobe';
// Mirrors BOBI_ANCHORS in WardrobeArt.tsx (kept local to avoid a circular import).
const A = { cx: 47.5, headTop: 15, chestY: 52, bodyR: 30 };

/** Costume-pack renderers (animal suits & cosy sets). Return undefined for ids they do not own. */
const INK = '#4a3226';
const sw = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const x = A.cx, y = A.chestY, r = A.bodyR;
const SUIT = `M${x - r + 3} ${y + 4}c2 12 10 20 ${r - 3} 20s${r - 5}-8 ${r - 3}-20c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`;
const Suit = ({ fill }: { fill: string }) => <path d={SUIT} fill={fill} {...sw}/>;
const Belly = ({ fill, w = 11 }: { fill: string; w?: number }) => <path d={`M${x - w} ${y + 3}c0 12 4 19 ${w} 19s${w}-7 ${w}-19c-6 3-${2 * w - 6} 3-${2 * w} 0Z`} fill={fill} {...sw} strokeWidth="1.2"/>;
const Paws = ({ fill }: { fill: string }) => <>{[34, 61].map(fx => <ellipse key={fx} cx={fx} cy="85" rx="6" ry="3.4" fill={fill} {...sw} strokeWidth="1.2"/>)}</>;
const Buttons = ({ fill }: { fill: string }) => <>{[6, 12, 18].map(d => <circle key={d} cx={x} cy={y + d} r="1.5" fill={fill} {...sw} strokeWidth=".8"/>)}</>;

export function CostumeHatArt({ id }: { id: WardrobeHat }) {
  const hx = A.cx, hy = A.headTop;
  const hood = (fill: string) => <path d={`M${hx - 24} ${hy + 10}c-1-13 10-19 24-19s25 6 24 19c-6-4-15-6-24-6s-18 2-24 6Z`} fill={fill} {...sw}/>;
  switch (id) {
    case 'tiger': return <g>{[-1, 1].map(s => <g key={s}><circle cx={hx + s * 17} cy={hy - 6} r="6" fill="#f0913a" {...sw}/><circle cx={hx + s * 17} cy={hy - 6} r="3" fill="#fff4e0"/></g>)}{hood('#f0913a')}<path d={`M${hx - 6} ${hy - 7}l2 6M${hx} ${hy - 9}v7M${hx + 6} ${hy - 7}l-2 6M${hx - 18} ${hy + 3}l5 1M${hx + 18} ${hy + 3}l-5 1`} stroke={INK} strokeWidth="2" strokeLinecap="round"/></g>;
    case 'penguin': return <g><path d={`M${hx - 25} ${hy + 11}c-1-14 10-21 25-21s26 7 25 21c-5-3-10-5-14-5-3-4-7-5-11-5s-8 1-11 5c-4 0-9 2-14 5Z`} fill="#33405a" {...sw}/><path d={`M${hx - 4} ${hy + 1}l4 4 4-4Z`} fill="#f2a53a" {...sw} strokeWidth="1.1"/></g>;
    case 'pig': return <g>{[-1, 1].map(s => <path key={s} d={`M${hx + s * 12} ${hy - 4}l${s * 10}-8 ${s * 2} 13Z`} fill="#f4a9b8" {...sw}/>)}{hood('#f7bfca')}<ellipse cx={hx} cy={hy - 2} rx="6" ry="4" fill="#f08fa3" {...sw} strokeWidth="1.2"/><circle cx={hx - 2} cy={hy - 2} r="1" fill={INK}/><circle cx={hx + 2} cy={hy - 2} r="1" fill={INK}/></g>;
    case 'dragon': return <g>{[-1, 1].map(s => <path key={s} d={`M${hx + s * 10} ${hy - 6}c${s * 2}-6 ${s * 6}-9 ${s * 10}-10-1 4-3 8-6 12Z`} fill="#f4d27a" {...sw}/>)}{hood('#6fb39a')}{[-8, 0, 8].map(d => <path key={d} d={`M${hx + d - 3} ${hy - 7}l3-6 3 6Z`} fill="#e8798a" {...sw} strokeWidth="1.1"/>)}</g>;
    case 'sheep': return <g><path d={`M${hx - 22} ${hy + 9}c-6-2-4-10 1-10-1-7 7-10 11-6 3-6 17-6 20 0 4-4 12-1 11 6 5 0 7 8 1 10-14-4-30-4-44 0Z`} fill="#fbf4e6" {...sw}/>{[-1, 1].map(s => <path key={s} d={`M${hx + s * 21} ${hy + 4}c${s * 6} 1 ${s * 10} 6 ${s * 8} 11 ${-s * 4} 0 ${-s * 7} -4 ${-s * 8} -9Z`} fill="#d8b49a" {...sw} strokeWidth="1.2"/>)}</g>;
    case 'rainhat': return <g transform={`rotate(-6 ${hx} ${hy})`}><path d={`M${hx - 28} ${hy + 8}c8-3 48-3 56 4-14 2-42 1-56-4Z`} fill="#f2c230" {...sw}/><path d={`M${hx - 16} ${hy + 6}c0-10 6-15 16-15s16 5 16 15c-10-2-22-2-32 0Z`} fill="#f7d34f" {...sw}/><path d={`M${hx - 10} ${hy - 4}c6-2 14-2 20 0`} fill="none" stroke="#fff4e0" strokeWidth="1.3"/></g>;
    case 'strawberry': return <g><path d={`M${hx - 22} ${hy + 10}c-2-14 10-20 22-20s24 6 22 20c-14-4-30-4-44 0Z`} fill="#e6566e" {...sw}/>{[[-12, 0], [-4, -5], [5, -2], [13, 2], [0, 4], [-15, 6], [16, 7]].map(([dx, dy]) => <ellipse key={`${dx}${dy}`} cx={hx + dx} cy={hy + dy} rx="1" ry="1.5" fill="#fff3c8"/>)}<path d={`M${hx} ${hy - 9}l-9-3 5 6-7 2 8 1 3-6 3 6 8-1-7-2 5-6Z`} fill="#7fae5c" {...sw} strokeWidth="1.2"/><path d={`M${hx} ${hy - 10}v-4`} {...sw}/></g>;
    case 'sleepcap': return <g><path d={`M${hx - 22} ${hy + 6}c2-12 14-18 26-16 8 2 14 6 22 2-2 6-8 10-14 10 4 2 8 4 8 4-14-2-28-2-42 0Z`} fill="#7d8fcf" {...sw}/><rect x={hx - 24} y={hy + 3} width="46" height="7" rx="3.5" fill="#fff4e0" {...sw}/><circle cx={hx + 27} cy={hy - 5} r="4.5" fill="#fff4e0" {...sw}/><path d={`M${hx - 8} ${hy - 3}l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2-1.5-1.4 2-.3Z`} fill="#f7d34f"/></g>;
    default: return undefined;
  }
}

export function CostumeBackArt({ outfit }: { outfit: WardrobeOutfit }) {
  switch (outfit) {
    case 'cat': return <path d={`M${x + 24} ${y + 20}c10 0 14-8 12-18-1-6 4-9 6-4 3 8-1 26-16 26Z`} fill="#8a6a58" {...sw}/>;
    case 'bunny': return <circle cx={x + 27} cy={y + 18} r="6" fill="#fbf1e2" {...sw}/>;
    case 'tiger': return <g><path d={`M${x + 24} ${y + 20}c12 0 16-12 18-22 1-4 6-3 5 1-2 12-7 25-21 25Z`} fill="#f0913a" {...sw}/><path d={`M${x + 38} ${y + 10}l5 2M${x + 41} ${y + 3}l5 1`} stroke={INK} strokeWidth="1.8" strokeLinecap="round"/></g>;
    case 'pig': return <path d={`M${x + 27} ${y + 16}c5-1 8 2 6 4-2 2-4-1-2-3 3-2 6 0 6 3`} fill="none" stroke="#f08fa3" strokeWidth="2.4" strokeLinecap="round"/>;
    case 'dragon': return <g>{[-1, 1].map(s => <path key={s} d={`M${x + s * 22} ${y - 2}c${s * 8} -10 ${s * 18} -14 ${s * 24} -12 ${-s * 2} 4 ${-s * 2} 8 0 10 ${-s * 4} 0 ${-s * 6} 2 ${-s * 6} 6 ${-s * 4} -1 ${-s * 7} 1 ${-s * 8} 4Z`} fill="#8fc6a8" {...sw}/>)}<path d={`M${x + 24} ${y + 20}c10 2 16-2 20-10l3 6-4 1c-4 8-12 10-20 8Z`} fill="#6fb39a" {...sw}/></g>;
    case 'sheep': return <circle cx={x + 26} cy={y + 18} r="5" fill="#fbf4e6" {...sw}/>;
    case 'penguin': return <path d={`M${x - 8} ${y + 26}l8 6 8-6Z`} fill="#33405a" {...sw}/>;
    default: return undefined;
  }
}

export function CostumeOutfitArt({ id }: { id: WardrobeOutfit }) {
  switch (id) {
    case 'cat': return <g><Suit fill="#8a6a58"/><Belly fill="#f3e2cf"/><path d={`M${x - 24} ${y + 8}l5 1M${x - 23} ${y + 13}l5 0M${x + 24} ${y + 8}l-5 1M${x + 23} ${y + 13}l-5 0`} stroke={INK} strokeWidth="1.5" strokeLinecap="round"/><Paws fill="#f3e2cf"/><path d={`M${x - 3} ${y + 1}h6l-3 3Z`} fill="#f3a7b2"/></g>;
    case 'bunny': return <g><Suit fill="#fbf1e2"/><Belly fill="#f7cfd6"/>{[-1, 1].map(s => <path key={s} d={`M${x + s * 22} ${y + 2}c${s * 6} -2 ${s * 9} 4 ${s * 6} 8 ${-s * 3} 2 ${-s * 6} 0 ${-s * 6} -8Z`} fill="#fbf1e2" {...sw} strokeWidth="1.2"/>)}<Paws fill="#f7cfd6"/></g>;
    case 'panda': return <g><Suit fill="#fbf7ef"/><path d={`M${x - 26} ${y + 3}c6-4 46-4 52 0l-1 8c-12-3-38-3-50 0Z`} fill="#2f2a2a" {...sw}/>{[-1, 1].map(s => <ellipse key={s} cx={x + s * 25} cy={y + 12} rx="5" ry="7" fill="#2f2a2a" {...sw}/>)}<Paws fill="#2f2a2a"/></g>;
    case 'frog': return <g><Suit fill="#8cc06a"/><Belly fill="#e9f0b8" w={13}/>{[[-14, 16], [15, 12], [-18, 8]].map(([dx, dy]) => <circle key={dx} cx={x + dx} cy={y + dy} r="2" fill="#6a9c4c"/>)}{[34, 61].map(fx => <path key={fx} d={`M${fx - 7} 86l2-4 5 1 5-1 2 4-4-1-3 2-3-2Z`} fill="#7aae58" {...sw} strokeWidth="1.1"/>)}</g>;
    case 'tiger': return <g><Suit fill="#f0913a"/><Belly fill="#fff4e0"/>{[-1, 1].map(s => <path key={s} d={`M${x + s * 26} ${y + 4}l${-s * 7} 3M${x + s * 26} ${y + 11}l${-s * 8} 2M${x + s * 24} ${y + 18}l${-s * 7} 1`} stroke={INK} strokeWidth="2.2" strokeLinecap="round"/>)}<Paws fill="#fff4e0"/></g>;
    case 'penguin': return <g><Suit fill="#33405a"/><path d={`M${x - 13} ${y + 1}c-2 14 4 22 13 22s15-8 13-22c-4 2-8 3-13 3s-9-1-13-3Z`} fill="#fbf7ef" {...sw} strokeWidth="1.2"/>{[-1, 1].map(s => <path key={s} d={`M${x + s * 25} ${y + 3}c${s * 7} 4 ${s * 8} 12 ${s * 5} 16 ${-s * 4} -3 ${-s * 6} -9 ${-s * 5} -16Z`} fill="#33405a" {...sw} strokeWidth="1.2"/>)}<path d={`M${x - 7} ${y - 1}h14l-2 3h-10Z`} fill="#f2a53a" {...sw} strokeWidth="1"/>{[34, 61].map(fx => <path key={fx} d={`M${fx - 6} 87l6-5 6 5Z`} fill="#f2a53a" {...sw} strokeWidth="1.1"/>)}</g>;
    case 'pig': return <g><Suit fill="#f7bfca"/><Belly fill="#fbdbe1"/><Buttons fill="#f08fa3"/>{[34, 61].map(fx => <g key={fx}><ellipse cx={fx} cy="85" rx="5.5" ry="3.4" fill="#e889a0" {...sw} strokeWidth="1.2"/><path d={`M${fx} 82.5v5`} stroke={INK} strokeWidth="1"/></g>)}</g>;
    case 'dragon': return <g><Suit fill="#6fb39a"/><path d={`M${x - 9} ${y + 2}c4-2 14-2 18 0l-1 18c-4 3-12 3-16 0Z`} fill="#f4d27a" {...sw} strokeWidth="1.2"/>{[7, 12, 17].map(d => <path key={d} d={`M${x - 7} ${y + d}h14`} stroke="#d4a94a" strokeWidth="1"/>)}{[[-20, 14], [20, 12], [-16, 20]].map(([dx, dy]) => <path key={dx} d={`M${x + dx - 2} ${y + dy}c1-2 3-2 4 0`} fill="none" stroke="#4d8d75" strokeWidth="1.2"/>)}<Paws fill="#4d8d75"/></g>;
    case 'sheep': return <g><path d={`M${x - 28} ${y + 6}c-4-6 2-12 7-9 2-5 9-5 11-1 4-3 16-3 20 0 2-4 9-4 11 1 5-3 11 3 7 9 4 4 1 10-3 10 2 6-4 10-8 8-4 6-14 8-18 2-4 6-14 4-18-2-4 2-10-2-8-8-4 0-7-6-1-10Z`} fill="#fbf4e6" {...sw}/>{[[-12, 8], [6, 6], [14, 16], [-4, 18]].map(([dx, dy]) => <path key={dx} d={`M${x + dx} ${y + dy}c2-2 4-2 5 0`} fill="none" stroke="#d9cdb4" strokeWidth="1.2" strokeLinecap="round"/>)}<Paws fill="#7a5a48"/></g>;
    case 'raincoat': return <g><path d={`M${x - r + 2} ${y + 6}c-1 10 4 22 ${r - 2} 22s${r - 1}-12 ${r - 2}-22c-4-7-12-9-${r - 2}-9s-${r - 6} 2-${r - 2} 9Z`} fill="#f7d34f" {...sw}/><path d={`M${x} ${y - 3}v31`} stroke={INK} strokeWidth="1.2"/>{[6, 13, 20].map(d => <path key={d} d={`M${x + 1} ${y + d}h4`} stroke="#b0602e" strokeWidth="2.2" strokeLinecap="round"/>)}<path d={`M${x - 8} ${y - 3}l8 6 8-6`} fill="#f2c230" {...sw} strokeWidth="1.2"/>{[34, 61].map(fx => <rect key={fx} x={fx - 5} y="81" width="10" height="7" rx="2" fill="#e6566e" {...sw} strokeWidth="1.2"/>)}</g>;
    case 'strawberry': return <g><path d={`M${x - r + 3} ${y + 4}c2 14 14 24 ${r - 3} 26s${r - 5}-12 ${r - 3}-26c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#e6566e" {...sw}/>{[[-16, 8], [-6, 12], [6, 9], [16, 12], [-10, 20], [2, 21], [11, 22], [0, 28], [-20, 2], [20, 3]].map(([dx, dy]) => <ellipse key={`${dx}${dy}`} cx={x + dx} cy={y + dy} rx="1" ry="1.6" fill="#fff3c8"/>)}<path d={`M${x - 22} ${y - 1}l6 5 4-3 4 4 4-3 4 4 4-4 4 3 4-4 4 3 6-5c-14 4-30 4-44 0Z`} fill="#7fae5c" {...sw} strokeWidth="1.2"/></g>;
    case 'pajamas': return <g><Suit fill="#a9b6e6"/>{[[-16, 6], [12, 4], [-6, 16], [16, 16], [2, 24], [-20, 16]].map(([dx, dy]) => <path key={`${dx}${dy}`} d={`M${x + dx} ${y + dy - 2}l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2Z`} fill="#f7d34f"/>)}<path d={`M${x - 10} ${y - 1}c3 4 7 5 10 3 3 2 7 1 10-3`} fill="#fff4e0" {...sw} strokeWidth="1.2"/><Buttons fill="#fff4e0"/><path d={`M${x + 12} ${y + 22}a4 4 0 1 0 4-6 3 3 0 1 1-4 6Z`} fill="#fff4e0" opacity=".9"/>{[34, 61].map(fx => <ellipse key={fx} cx={fx} cy="85" rx="6" ry="3.4" fill="#f3a7b2" {...sw} strokeWidth="1.2"/>)}</g>;
    default: return undefined;
  }
}

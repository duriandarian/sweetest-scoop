import { CostumeBackArt, CostumeHatArt, CostumeOutfitArt } from './CostumeArt';
import { PetArt } from './PetArt';
import type { WardrobeAccessory, WardrobeHat, WardrobeOutfit } from './wardrobe';

/**
 * Anchor coordinates on the 100x100 normalized base sprite (public/story/bobi-dressup-base.webp).
 * Update these once the final base sprite geometry is confirmed; every layer is drawn relative to them.
 */
export const BOBI_ANCHORS = {
  cx: 47.5,      // body horizontal center (body circle x16..81, y15..79)
  faceX: 45.5,   // face center (eyes at x31 / x60)
  headTop: 15,   // top of the round head; hats live in y11..23
  eyeY: 33,
  eyeDx: 14.5,
  cheekY: 41,    // painted cheeks at x25 / x64 — never cover
  cheekDx: 20,
  chestY: 52,    // clothes start at y51+
  bellyY: 70,
  bodyR: 30,
  handRX: 87, handRY: 59,
  handLX: 12, handLY: 59,
};
const A = BOBI_ANCHORS;
const INK = '#4a3226';
const sw = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export function HatArt({ id }: { id: WardrobeHat }) {
  const x = A.cx, y = A.headTop;
  switch (id) {
    case 'beret': return <g><path d={`M${x - 20} ${y + 6}c2-10 14-14 24-12 10 2 16 8 14 14-12-4-26-5-38-2Z`} fill="#c9475c" {...sw}/><path d={`M${x + 1} ${y - 7}l1-4`} {...sw}/><path d={`M${x - 15} ${y + 3}c6-5 16-7 26-4`} fill="none" stroke="#e8798a" strokeWidth="1.4" strokeLinecap="round"/></g>;
    case 'bow': return <g transform={`translate(${x + 12} ${y + 2}) rotate(14)`}><path d="M0 0c-6-8-15-7-14 0 1 7 8 7 14 0Z" fill="#f08aa1" {...sw}/><path d="M0 0c6-8 15-7 14 0-1 7-8 7-14 0Z" fill="#f08aa1" {...sw}/><path d="M-1 1l-4 9M1 1l4 9" {...sw} stroke="#c95870"/><circle r="3.4" fill="#f6b8c6" {...sw}/></g>;
    case 'flower': return <g transform={`translate(${x - 14} ${y + 3})`}>{[0, 72, 144, 216, 288].map(r => <ellipse key={r} cx="0" cy="-5.5" rx="4" ry="6" fill="#fff4e0" {...sw} strokeWidth="1.2" transform={`rotate(${r})`}/>)}<circle r="3" fill="#f4bf45" {...sw} strokeWidth="1.2"/><path d="M6 6c5 1 9 4 10 8-5 0-9-3-10-8Z" fill="#7fae5c" {...sw} strokeWidth="1.2"/></g>;
    case 'cat': return <g><path d={`M${x - 22} ${y + 10}l-2-17 14 8Z`} fill="#5b4334" {...sw}/><path d={`M${x - 21} ${y + 6}l-1-8 6 4Z`} fill="#f3a7b2"/><path d={`M${x + 22} ${y + 10}l2-17-14 8Z`} fill="#5b4334" {...sw}/><path d={`M${x + 21} ${y + 6}l1-8-6 4Z`} fill="#f3a7b2"/><path d={`M${x - 22} ${y + 10}c10-8 34-8 44 0`} fill="none" stroke="#5b4334" strokeWidth="3" strokeLinecap="round"/></g>;
    case 'frog': return <g><path d={`M${x - 24} ${y + 9}c-1-12 10-18 24-18s25 6 24 18c-6-4-15-6-24-6s-18 2-24 6Z`} fill="#8cc06a" {...sw}/>{[-1, 1].map(s => <g key={s}><circle cx={x + s * 13} cy={y - 7} r="7" fill="#8cc06a" {...sw}/><circle cx={x + s * 13} cy={y - 7} r="4" fill="#fffaf0" stroke="none"/><circle cx={x + s * 13 + 0.6} cy={y - 6.4} r="2" fill={INK}/></g>)}<circle cx={x - 18} cy={y + 4} r="2" fill="#f3a7b2" opacity=".8"/><circle cx={x + 18} cy={y + 4} r="2.2" fill="#f3a7b2" opacity=".8"/></g>;
    case 'crown': return <g transform={`translate(${x} ${y - 1}) rotate(-8)`}><path d="M-12 4-14-10-6-3 0-13 6-3 14-10 12 4Z" fill="#f4c542" {...sw}/><path d="M-12 4h24" {...sw}/><circle cx="0" cy="-2" r="2.2" fill="#e66a7c"/><circle cx="-7" cy="0" r="1.4" fill="#8fc6c0"/><circle cx="7" cy="0" r="1.4" fill="#8fc6c0"/></g>;
    case 'chef': return <g><path d={`M${x - 14} ${y + 4}c-9 1-12-10-5-14 2-8 12-10 16-4 5-6 15-3 15 4 8 2 7 15-2 14Z`} fill="#fff8ea" {...sw}/><rect x={x - 14} y={y + 1} width="28" height="7" rx="2" fill="#fff8ea" {...sw}/><path d={`M${x - 5} ${y - 2}v4M${x + 4} ${y - 3}v5`} stroke="#d9cdb4" strokeWidth="1.2"/></g>;
    case 'beanie': return <g><path d={`M${x - 21} ${y + 6}c0-12 10-17 21-17s21 5 21 17Z`} fill="#4f8fb8" {...sw}/><rect x={x - 23} y={y + 2} width="46" height="7" rx="4" fill="#3c7299" {...sw}/>{[-15, -7, 1, 9, 17].map(d => <path key={d} d={`M${x + d} ${y + 3}v5`} stroke="#2e5d80" strokeWidth="1"/>)}<circle cx={x} cy={y - 11} r="5" fill="#f6efe0" {...sw}/></g>;
    case 'bunny': return <g>{[-1, 1].map(s => <g key={s} transform={`rotate(${s * 12} ${x + s * 8} ${y + 6})`}><path d={`M${x + s * 8 - 5} ${y + 6}c-1-10 1-19 5-19s6 9 5 19Z`} fill="#fbf1e2" {...sw}/><path d={`M${x + s * 8 - 2} ${y + 3}c0-7 1-12 2-12s2 5 2 12Z`} fill="#f3a7b2"/></g>)}</g>;
    case 'bear': return <g>{[-1, 1].map(s => <g key={s}><circle cx={x + s * 17} cy={y + 3} r="6.5" fill="#8a5a3c" {...sw}/><circle cx={x + s * 17} cy={y + 3} r="3.4" fill="#d7a27a"/></g>)}<path d={`M${x - 18} ${y + 8}c10-7 26-7 36 0`} fill="none" stroke="#8a5a3c" strokeWidth="3" strokeLinecap="round"/></g>;
    case 'panda': return <g><path d={`M${x - 22} ${y + 9}c0-12 10-18 22-18s22 6 22 18c-6-4-14-6-22-6s-16 2-22 6Z`} fill="#fbf7ef" {...sw}/>{[-1, 1].map(s => <circle key={s} cx={x + s * 17} cy={y - 6} r="6" fill="#2f2a2a" {...sw}/>)}</g>;
    case 'mushroom': return <g><path d={`M${x - 22} ${y + 7}c0-13 10-20 22-20s22 7 22 20c-8-3-36-3-44 0Z`} fill="#d9473f" {...sw}/>{[[-12, 0, 3.2], [3, -7, 3.6], [13, 1, 2.6], [-3, 3, 2]].map(([dx, dy, rr]) => <circle key={dx} cx={x + dx} cy={y + dy} r={rr} fill="#fff4e0"/>)}</g>;
    case 'none': return null;
    case 'pirate': return <g><path d={`M${x - 24} ${y + 6}c6-4 10-14 24-14s18 10 24 14c-6 3-12 3-24 0-12 3-18 3-24 0Z`} fill="#2f2a33" {...sw}/><path d={`M${x - 22} ${y + 5}c12 2 32 2 44 0`} fill="none" stroke="#e9b949" strokeWidth="1.4"/><circle cx={x} cy={y - 1} r="3" fill="#fff4e0"/><path d={`M${x - 4} ${y + 3}l8-3M${x - 4} ${y}l8 3`} stroke="#fff4e0" strokeWidth="1.2" strokeLinecap="round"/></g>;
    default: return CostumeHatArt({ id }) ?? null;
  }
}

/** Drawn BEHIND the body sprite: tails, capes, backpacks. */
export function BackArt({ outfit }: { outfit: WardrobeOutfit }) {
  const x = A.cx, y = A.chestY;
  switch (outfit) {
    case 'dinosaur': return <g><path d={`M${x + 26} ${y + 18}c10 2 18 0 24-8-2 10-10 18-22 18Z`} fill="#7fb069" {...sw}/>{[[-16, -36], [-4, -40], [8, -38], [20, -30], [29, -18]].map(([dx, dy]) => <path key={dx} d={`M${x + dx - 4} ${y + dy + 4}l4-8 4 8Z`} fill="#f2bd55" {...sw} strokeWidth="1.2"/>)}</g>;
    case 'fox': return <g><path d={`M${x + 24} ${y + 20}c14-2 22-14 20-26 6 10 6 26-8 32-6 2-10 0-12-6Z`} fill="#e77b3a" {...sw}/><path d={`M${x + 44} ${y - 6}c4 6 4 12 2 16-3-1-5-6-2-16Z`} fill="#fff4e0"/></g>;
    case 'superhero': return <path d={`M${x - 22} ${y - 4}c-8 14-12 26-12 34 14-4 30-4 44 0 0-8-4-20-12-34Z`} fill="#d9473f" {...sw}/>;
    case 'astronaut': return <rect x={x - 33} y={y - 6} width="66" height="26" rx="6" fill="#c9d3dc" {...sw}/>;
    case 'none': return null;
    default: return CostumeBackArt({ outfit }) ?? null;
  }
}

export function OutfitArt({ id }: { id: WardrobeOutfit }) {
  const x = A.cx, y = A.chestY, r = A.bodyR;
  const hem = `M${x - r + 3} ${y + 4}c2 12 10 20 ${r - 3} 20s${r - 5}-8 ${r - 3}-20`;
  switch (id) {
    case 'apron': return <g><path d={`M${x - 11} ${y + 1}h22l2 18c-6 4-20 4-26 0Z`} fill="#f9e6c3" {...sw}/><path d={`M${x - 11} ${y + 1}c-3-2-5-3-6-5M${x + 11} ${y + 1}c3-2 5-3 6-5`} fill="none" {...sw} stroke="#c9475c"/><rect x={x - 6} y={y + 7} width="12" height="7" rx="2" fill="#f2bd55" {...sw} strokeWidth="1.2"/><path d={`M${x - 22} ${y + 2}c8 2 36 2 44 0`} fill="none" stroke="#c9475c" strokeWidth="2.4" strokeLinecap="round"/></g>;
    case 'overalls': return <g><path d={`M${x - r + 4} ${y + 8}c4 12 12 16 ${r - 4} 16s${r - 8}-4 ${r - 4}-16Z`} fill="#5d86b5" {...sw}/><rect x={x - 9} y={y} width="18" height="11" rx="2" fill="#5d86b5" {...sw}/><path d={`M${x - 9} ${y + 1}l-6-5M${x + 9} ${y + 1}l6-5`} stroke="#5d86b5" strokeWidth="3.5" strokeLinecap="round"/><circle cx={x - 7} cy={y + 3} r="1.5" fill="#f4c542"/><circle cx={x + 7} cy={y + 3} r="1.5" fill="#f4c542"/><path d={`M${x - 4} ${y + 6}h8v4h-8Z`} fill="#4a6f9a" stroke="none"/></g>;
    case 'scarf': return <g transform="translate(0 2)"><path d={`M${x - 20} ${y - 3}c10 6 30 6 40 0l1 6c-12 6-30 6-42 0Z`} fill="#e46b54" {...sw}/><path d={`M${x + 8} ${y + 2}l3 16 6-1-2-15Z`} fill="#e46b54" {...sw}/>{[-14, -6, 2, 10].map(d => <path key={d} d={`M${x + d} ${y - 1}v6`} stroke="#f7d7a0" strokeWidth="1.6"/>)}<path d={`M${x + 11} ${y + 18}v3M${x + 14} ${y + 18}v3`} {...sw} strokeWidth="1.2"/></g>;
    case 'sweater': return <g><path d={`${hem}c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#b48ad1" {...sw}/><path d={`M${x - 10} ${y + 2}c4 4 16 4 20 0`} fill="none" stroke="#f6efe0" strokeWidth="2.4" strokeLinecap="round"/>{[-12, 0, 12].map(d => <path key={d} d={`M${x + d - 3} ${y + 13}l3 3 3-3`} fill="none" stroke="#f6efe0" strokeWidth="1.4" strokeLinecap="round"/>)}</g>;
    case 'kimono': return <g><path d={`${hem}c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#3f6e8c" {...sw}/><path d={`M${x - 10} ${y}l10 12 10-12`} fill="none" stroke="#fff4e0" strokeWidth="2.2"/><rect x={x - r + 6} y={y + 10} width={2 * r - 12} height="6" fill="#f2bd55" {...sw} strokeWidth="1.2"/>{[[-14, 20], [12, 21], [-4, 5]].map(([dx, dy]) => <circle key={dx} cx={x + dx} cy={y + dy} r="1.8" fill="#f3a7b2"/>)}</g>;
    case 'dinosaur': return <g><path d={`${hem}c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#7fb069" {...sw}/><path d={`M${x - 10} ${y + 6}c4-2 16-2 20 0l-2 16c-4 3-12 3-16 0Z`} fill="#f6e3b0" {...sw} strokeWidth="1.2"/>{[10, 15, 20].map(d => <path key={d} d={`M${x - 8} ${y + d}h16`} stroke="#c9a96a" strokeWidth="1"/>)}</g>;
    case 'astronaut': return <g><path d={`${hem}c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#eef1f4" {...sw}/><rect x={x - 9} y={y + 6} width="18" height="10" rx="2" fill="#5d86b5" {...sw} strokeWidth="1.2"/><circle cx={x - 4} cy={y + 11} r="1.8" fill="#e6566e"/><circle cx={x + 1} cy={y + 11} r="1.8" fill="#f4c542"/><path d={`M${x + 4} ${y + 9}h3M${x + 4} ${y + 13}h3`} stroke="#fff" strokeWidth="1"/><path d={`M${x - 22} ${y + 18}h44`} stroke="#e77b3a" strokeWidth="2.4"/></g>;
    case 'fox': return <g><path d={`${hem}c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#e77b3a" {...sw}/><path d={`M${x - 10} ${y + 1}l10 10 10-10c0 12-4 22-10 22s-10-10-10-22Z`} fill="#fff4e0" {...sw} strokeWidth="1.2"/></g>;
    case 'duck': return <g><path d={`${hem}c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#f7d34f" {...sw}/>{[-1, 1].map(s => <path key={s} d={`M${x + s * 24} ${y + 6}c ${s * 8} 2 ${s * 10} 8 ${s * 8} 14 c ${-s * 5} -1 ${-s * 8} -6 ${-s * 8} -14 Z`} fill="#f2bd55" {...sw} strokeWidth="1.2"/>)}{[34, 61].map(fx => <path key={fx} d={`M${fx - 6} 87l6-5 6 5-3-1-3 2-3-2Z`} fill="#ef8a2f" {...sw} strokeWidth="1.1"/>)}</g>;
    case 'superhero': return <g><path d={`${hem}c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#3f6fb5" {...sw}/><path d={`M${x} ${y + 4}l2.4 5 5.4.6-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.6Z`} fill="#f4c542" {...sw} strokeWidth="1.1"/><path d={`M${x - 22} ${y - 1}c4 3 8 4 10 4M${x + 22} ${y - 1}c-4 3-8 4-10 4`} fill="none" stroke="#d9473f" strokeWidth="2.6" strokeLinecap="round"/></g>;
    case 'bee': return <g><path d={`${hem}c-4-6-10-8-${r - 3}-8s-${r - 9} 2-${r - 3} 8Z`} fill="#f4c542" {...sw}/><path d={`M${x - 22} ${y + 8}h44M${x - 18} ${y + 16}h36`} stroke={INK} strokeWidth="3.6"/>{[-1, 1].map(s => <ellipse key={s} cx={x + s * 24} cy={y - 2} rx="8" ry="5.5" fill="#e3f1f3" opacity=".92" {...sw} strokeWidth="1.2" transform={`rotate(${s * -30} ${x + s * 24} ${y - 2})`}/>)}</g>;
    case 'none': return null;
    default: return CostumeOutfitArt({ id }) ?? null;
  }
}

export function AccessoryArt({ id }: { id: WardrobeAccessory }) {
  const hx = A.handRX, hy = A.handRY;
  switch (id) {
    case 'schnauzer':
    case 'turtle': return <PetArt pet={id}/>;
    case 'tea': return <g transform={`translate(${hx - 1} ${hy - 4}) scale(.85)`}><path d="M-7-6h14l-2 17h-10Z" fill="#fde8b0" {...sw}/><path d="M-6.4-1h12.8l-1.4 11h-10Z" fill="#f2b437"/><circle cx="-2" cy="7" r="1.3" fill="#fff8ea"/><circle cx="2" cy="5" r="1.3" fill="#fff8ea"/><circle cx="0" cy="8.5" r="1.3" fill="#fff8ea"/><path d="M-8-6h16" {...sw}/><path d="M2-6l3-8" stroke="#e66a7c" strokeWidth="2.2" strokeLinecap="round"/></g>;
    case 'heart': return <g><path d={`M${hx} ${hy}c2-10 0-18 2-26`} fill="none" stroke={INK} strokeWidth="1"/><path d={`M${hx + 2} ${hy - 24}c-8-4-11-12-6-15 3-2 5 0 6 2 1-2 3-4 6-2 5 3 2 11-6 15Z`} fill="#e6566e" {...sw}/><path d={`M${hx - 1} ${hy - 35}c1-1 2-1 3 0`} stroke="#ffd2da" strokeWidth="1.4" strokeLinecap="round"/></g>;
    case 'star': return <g><path d={`M${hx} ${hy + 2}l6-20`} stroke="#c58a3c" strokeWidth="2.4" strokeLinecap="round"/><path d={`M${hx + 6} ${hy - 30}l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z`} fill="#f7d34f" {...sw}/></g>;
    case 'mango': return <g transform={`translate(${hx} ${hy - 4}) rotate(-15)`}><path d="M0 9c-8 0-11-6-9-12 2-6 9-7 13-4 5 3 6 9 3 13-2 2-4 3-7 3Z" fill="#f5b740" {...sw}/><path d="M2-7c2-5 7-6 10-5-1 4-5 6-10 5Z" fill="#7fae5c" {...sw} strokeWidth="1.2"/><path d="M-5-1c1-2 3-3 5-3" stroke="#ffe3a0" strokeWidth="1.4" strokeLinecap="round"/></g>;
    case 'glasses': return <g fill="rgba(220,240,245,.18)" stroke="#5b3a2c" strokeWidth="1.7">{[-1, 1].map(s => <circle key={s} cx={A.faceX + s * A.eyeDx} cy={A.eyeY} r="7"/>)}<path d={`M${A.faceX - 7.5} ${A.eyeY - 1}q7.5-4 15 0`} fill="none"/></g>;
    case 'blush': return <g>{[-1, 1].map(s => { const bx = A.faceX + s * (A.cheekDx + 11), by = A.cheekY - 6; return <path key={s} d={`M${bx} ${by + 4}c-4-2.6-5-5.6-3-7 1.4-1 2.6-.2 3 .8.4-1 1.6-1.8 3-.8 2 1.4 1 4.4-3 7Z`} fill="#f07c8f" {...sw} strokeWidth="1"/>; })}</g>;
    case 'donut': return <g transform={`translate(${hx - 1} ${hy - 3})`}><circle r="8" fill="#d9a066" {...sw}/><path d="M-7-2c2-6 12-7 14 0 0 3-3 2-4 4-2-2-5 1-6-1-2 2-4-1-4-3Z" fill="#f3a7b2"/><circle r="2.6" fill="#fff8ea" {...sw} strokeWidth="1.1"/>{[[-4, -4, '#7fb069'], [3, -5, '#5d86b5'], [5, -1, '#f4c542']].map(([sx, sy, f]) => <path key={String(sx)} d={`M${sx} ${sy}l1.5 .8`} stroke={String(f)} strokeWidth="1.3" strokeLinecap="round"/>)}</g>;
    case 'umbrella': return <g><path d={`M${A.handLX} ${A.handLY}l2-38`} stroke="#8a5a3c" strokeWidth="1.8" strokeLinecap="round"/><path d={`M${A.handLX - 12} ${A.handLY - 34}c2-12 26-12 28 0-4-2-6-2-7 0-2-2-5-2-7 0-2-2-5-2-7 0-2-2-5-2-7 0Z`} fill="#8fc6c0" {...sw}/><path d={`M${A.handLX + 2} ${A.handLY - 45}v11M${A.handLX - 5} ${A.handLY - 43}l-1 9M${A.handLX + 9} ${A.handLY - 43}l1 9`} stroke="#fff4e0" strokeWidth="1"/></g>;
    case 'guitar': return <g transform={`translate(${hx - 4} ${hy}) rotate(-35)`}><path d="M-1-22h2v16h-2Z" fill="#8a5a3c" {...sw} strokeWidth="1.1"/><rect x="-2.5" y="-26" width="5" height="5" rx="1" fill="#5b3a2c"/><path d="M0-7c5 0 7 3 6 6 3 2 3 9-6 9s-9-7-6-9c-1-3 1-6 6-6Z" fill="#f2bd55" {...sw}/><circle cy="0" r="1.8" fill="#5b3a2c"/></g>;
    case 'headphones': return <g><path d={`M${A.cx - 31} ${A.eyeY + 2}c0-22 62-22 62 0`} fill="none" stroke="#3f6fb5" strokeWidth="3" strokeLinecap="round"/>{[-1, 1].map(s => <rect key={s} x={A.cx + s * 32 - 4} y={A.eyeY - 2} width="8" height="12" rx="4" fill="#e6566e" {...sw}/>)}</g>;
    case 'sparkles': return <g fill="#f7d34f" {...sw} strokeWidth="1.1">{[[12, 22, 5.5], [85, 20, 5], [93, 40, 3.4], [6, 40, 3.4]].map(([cx, cy, s]) => <path key={cx} d={`M${cx} ${cy - s}q1 ${s - 1} ${s} ${s}q${1 - s} 1-${s} ${s}q-1-${s - 1}-${s}-${s}q${s - 1}-1 ${s}-${s}Z`}/>)}</g>;
    default: return null;
  }
}

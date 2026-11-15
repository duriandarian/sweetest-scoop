import { memo } from 'react';
import { memories, PHOTO_H, PHOTO_W } from './storyData';
import { mangoes, photoPos, ribbons, sago, SURFACE_Y, WORLD_BOTTOM, WORLD_TOP, WORLD_X } from './storyChoreo';

export type DrinkRefs = { cam: SVGGElement | null; photos: (SVGGElement | null)[] };

const MANGO = 'M-0.5 -0.42 Q-0.48 -0.52 -0.36 -0.5 L0.4 -0.46 Q0.52 -0.44 0.5 -0.32 L0.46 0.38 Q0.44 0.52 0.3 0.5 L-0.38 0.46 Q-0.52 0.44 -0.5 0.32Z';
const SURFACE = (() => { let d = `M${-WORLD_X} ${SURFACE_Y}`; for (let x = -WORLD_X; x < WORLD_X; x += 120) d += ` q30 -9 60 0 t60 0`; return d; })();

/** the illustrated drink: interior coordinates only, no vessel anywhere */
export const MangoDrink = memo(function MangoDrink({ w, h, refs }: { w: number; h: number; refs: React.MutableRefObject<DrinkRefs> }) {
  const r = refs.current;
  return <svg className="scene-svg" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
    <defs>
      <linearGradient id="md-liquid" gradientUnits="userSpaceOnUse" x1="0" y1={SURFACE_Y} x2="0" y2={WORLD_BOTTOM}>
        <stop stopColor="#fff4cf"/><stop offset=".18" stopColor="#ffe39a"/><stop offset=".5" stopColor="#fdd06e"/><stop offset=".8" stopColor="#f8bd55"/><stop offset="1" stopColor="#f3ad48"/>
      </linearGradient>
      <radialGradient id="md-sago" cx=".38" cy=".34" r=".7">
        <stop stopColor="#fffdf4" stopOpacity=".95"/><stop offset=".5" stopColor="#fff6dc" stopOpacity=".55"/><stop offset=".92" stopColor="#f6dc9a" stopOpacity=".45"/><stop offset="1" stopColor="#e9c06a" stopOpacity=".7"/>
      </radialGradient>
      <linearGradient id="md-mango" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffcf3f"/><stop offset=".55" stopColor="#ffab1f"/><stop offset="1" stopColor="#f28a16"/></linearGradient>
      <symbol id="md-pearl" overflow="visible">
        <circle r="1" fill="url(#md-sago)" stroke="#e7bf6b" strokeOpacity=".9" strokeWidth=".09"/>
        <circle r=".34" fill="#f7e2ad" opacity=".75"/>
        <ellipse cx="-.38" cy="-.42" rx=".24" ry=".12" transform="rotate(-35 -.38 -.42)" fill="#fff" opacity=".85"/>
      </symbol>
      <symbol id="md-cube" overflow="visible">
        <path d={MANGO} fill="url(#md-mango)" stroke="#e07d12" strokeWidth=".035"/>
        <path d="M-.3 -.3 Q-.05 -.38 .28 -.32" stroke="#fff3c4" strokeWidth=".07" fill="none" strokeLinecap="round" opacity=".85"/>
        <path d="M-.32 .05 Q0 0 .3 .08 M-.25 .25 Q.02 .22 .28 .28" stroke="#f39a1c" strokeWidth=".035" fill="none" opacity=".7"/>
      </symbol>
    </defs>
    <g ref={el => { r.cam = el; }}>
      {/* cafe air above the drink, then the liquid itself */}
      <rect x={-WORLD_X} y={WORLD_TOP} width={WORLD_X * 2} height={SURFACE_Y - WORLD_TOP + 10} fill="#f4f1df"/>
      <path d={`${SURFACE} V${WORLD_BOTTOM} H${-WORLD_X} Z`} fill="url(#md-liquid)"/>
      <path d={SURFACE} stroke="#fffaf0" strokeWidth="7" fill="none" opacity=".9"/>
      <path d={SURFACE} stroke="#f2c25a" strokeWidth="1.4" fill="none" transform="translate(0 8)" opacity=".6"/>
      {ribbons.map((rb, i) => <g key={i} className="md-sway" style={{ animationDuration: `${rb.dur}s`, animationDelay: `${-i * 1.3}s` }}>
        <path d={rb.d} stroke="#fffaf0" strokeWidth={rb.w} opacity={rb.o} fill="none" strokeLinecap="round"/>
        <path d={rb.d} stroke="#fffdf7" strokeWidth={2} opacity={rb.o * 1.8} fill="none" transform={`translate(0 ${-rb.w / 3})`}/>
      </g>)}
      {sago.map((p, i) => <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}><g className="md-bob" style={{ animationDelay: `${-p.d}s` }}><use href="#md-pearl" transform={`scale(${p.r.toFixed(2)})`}/></g></g>)}
      {mangoes.map((m, i) => <g key={i} transform={`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${m.a.toFixed(0)})`}><g className="md-bob md-slow" style={{ animationDelay: `${-m.d}s` }}><use href="#md-cube" transform={`scale(${m.s.toFixed(1)})`}/></g></g>)}
      {memories.map((m, c) => { const p = photoPos(c); return <g key={c} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.s})`}>
        <g ref={el => { r.photos[c] = el; }} style={{ opacity: 0 }}>
          <rect x={-PHOTO_W / 2 - 6} y={-PHOTO_H / 2 - 6} width={PHOTO_W + 12} height={PHOTO_H + 12} rx="10" fill="#fffbf0" stroke="#efd28c" strokeWidth="1"/>
          <svg x={-PHOTO_W / 2} y={-PHOTO_H / 2} width={PHOTO_W} height={PHOTO_H - 22} overflow="hidden"><image href={m.src} width={PHOTO_W} height={PHOTO_H - 22} preserveAspectRatio="xMidYMid slice"/></svg>
          <text x={-PHOTO_W / 2 + 2} y={PHOTO_H / 2 - 4} className="photo-num">{String(c + 1).padStart(2, '0')}  {m.date}</text>
          <circle cx={PHOTO_W / 2 - 4} cy={-PHOTO_H / 2 - 2} r="9" fill="url(#md-sago)" stroke="#e7bf6b" strokeOpacity=".6"/>
        </g>
      </g>; })}
    </g>
  </svg>;
});

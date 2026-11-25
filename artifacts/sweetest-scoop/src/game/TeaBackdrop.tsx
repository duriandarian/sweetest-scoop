import { useId } from 'react';

/* Irregular milky sago clusters: [x, y, r]. Hand-placed, deliberately uneven. */
const SAGO: [number, number, number][] = [
  [62, 452, 7], [74, 446, 5.5], [70, 462, 6], [84, 457, 4.5], [55, 466, 5],
  [214, 470, 6.5], [226, 463, 5], [231, 476, 6], [244, 468, 4.2],
  [388, 458, 5.5], [399, 467, 7], [412, 459, 5], [405, 478, 5.5], [421, 472, 4.5], [380, 472, 4],
  [566, 466, 6], [578, 474, 5], [590, 463, 4.5],
  [706, 450, 6.5], [719, 459, 5.5], [731, 449, 4.6], [712, 472, 5], [744, 462, 4],
  [150, 400, 4], [318, 410, 3.6], [498, 396, 4.2], [645, 412, 3.4], [286, 486, 4.6], [520, 482, 5],
];
/* Mango cubes: [x, y, size, rotation] */
const CUBES: [number, number, number, number][] = [
  [120, 430, 30, -12], [300, 446, 26, 9], [470, 432, 32, -5], [640, 440, 27, 14], [180, 478, 22, 21], [600, 480, 24, -18],
];
/* Pomelo vesicles: [x, y, rotation] */
const POMELO: [number, number, number][] = [
  [262, 420, 30], [352, 434, -20], [548, 422, 60], [676, 426, -45], [104, 474, 15], [452, 486, -70],
];

/** Decorative art only: all Bobis and answer statuses remain live DOM elements. */
export function TeaBackdrop() {
  const id = useId().replace(/:/g, '');
  const liquid = `sago-liquid-${id}`, pearl = `sago-pearl-${id}`, wash = `sago-wash-${id}`;
  return <span className="mt-backdrop" data-theme="mango-sago" aria-hidden="true">
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" focusable="false">
      <defs>
        <linearGradient id={liquid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6df" stopOpacity="0"/>
          <stop offset=".35" stopColor="#fde6b0" stopOpacity=".75"/>
          <stop offset=".75" stopColor="#f9cf78" stopOpacity=".85"/>
          <stop offset="1" stopColor="#f5bb57" stopOpacity=".9"/>
        </linearGradient>
        <radialGradient id={pearl} cx=".38" cy=".34" r=".7">
          <stop offset="0" stopColor="#fffdf6"/>
          <stop offset=".6" stopColor="#f6efe0" stopOpacity=".92"/>
          <stop offset="1" stopColor="#e7dbc2" stopOpacity=".85"/>
        </radialGradient>
        <filter id={wash} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7"/>
          <feDisplacementMap in="SourceGraphic" scale="14"/>
        </filter>
      </defs>
      <g filter={`url(#${wash})`}>
        <rect x="0" y="0" width="800" height="500" fill={`url(#${liquid})`}/>
        {/* coconut cream swirls */}
        <path d="M-10 250C110 222 190 276 320 250S540 214 660 246 790 262 810 240V300C690 318 600 284 470 304S220 326 90 300-10 296-10 296Z" fill="#fffaf0" opacity=".55"/>
        <path d="M-10 350C140 330 250 372 400 352S640 324 810 348V380C650 364 520 394 380 384S120 366-10 384Z" fill="#fff8ea" opacity=".45"/>
        <path d="M-10 420C180 404 300 440 470 424S700 406 810 420V500H-10Z" fill="#f7c160" opacity=".35"/>
      </g>
      <g opacity=".9">
        {CUBES.map(([x, y, s, r], i) => <g key={i} transform={`rotate(${r} ${x} ${y})`}>
          <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * .22} fill="#f6b23f" opacity=".82"/>
          <rect x={x - s / 2 + 3} y={y - s / 2 + 3} width={s * .55} height={s * .4} rx={s * .18} fill="#ffdb86" opacity=".7"/>
        </g>)}
        {POMELO.map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="11" ry="3.4" transform={`rotate(${r} ${x} ${y})`} fill="#ee9a95" opacity=".72"/>)}
        {SAGO.map(([x, y, r], i) => <g key={i}>
          <circle cx={x} cy={y} r={r} fill={`url(#${pearl})`} stroke="#e2d2b1" strokeWidth=".7" strokeOpacity=".6"/>
          <circle cx={x - r * .3} cy={y - r * .32} r={r * .26} fill="#fffef9" opacity=".85"/>
        </g>)}
      </g>
    </svg>
  </span>;
}

function CupSpoon({ scooping }: { scooping: boolean }) {
  const id = useId().replace(/:/g, '');
  const wood = `cup-spoon-wood-${id}`;
  const bowl = `cup-spoon-bowl-${id}`;
  return <svg className={`mt-spoon${scooping ? ' is-scooping' : ''}`} viewBox="0 0 124 139" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={wood} x1="0%" y1="0%" x2="100%" y2="12%">
        <stop stopColor="#a76a43"/><stop offset=".45" stopColor="#e4ac77"/><stop offset=".78" stopColor="#d18d58"/><stop offset="1" stopColor="#a56a46"/>
      </linearGradient>
      <radialGradient id={bowl} cx="47%" cy="60%" r="68%">
        <stop stopColor="#c48b61"/><stop offset=".68" stopColor="#a06844"/><stop offset="1" stopColor="#71462f"/>
      </radialGradient>
    </defs>
    <g className="mt-spoon-stroke">
      <g transform="translate(40 105) rotate(216) translate(-27 -27)">
        <path d="M27 3C13 2 4 11 5 26C5 38 11 47 20 52C23 54 23 59 22.5 65L20 132C19.7 137 22 140 27 140C31 140 34 137 33.6 132L31.4 65C31.2 59 31.8 55 35 52C44 47 50 38 50 26C50 12 41 3 27 3Z" fill={`url(#${wood})`} stroke="#895638" strokeWidth="2.3"/>
        <path d="M27 8C16 7 9 14 10 26C10 39 18 48 27 49C36 48 45 39 45 26C45 14 38 8 27 8Z" fill={`url(#${bowl})`} stroke="#ac7149" strokeWidth="1.2"/>
        <path d="M11 18C15 10 21 6 29 6M28 63C27 83 25 110 25 132Q25 135 27 136" stroke="#f6d3a5" strokeWidth="1.6" strokeLinecap="round" opacity=".84"/>
        <path d="M19 12C10 25 15 37 25 45M28 11C19 20 19 33 30 43M37 15C28 23 28 32 36 37M30 76C31 89 28 106 30 126" stroke="#7c4a33" strokeWidth="1.2" strokeLinecap="round" opacity=".44"/>
      </g>
    </g>
    <path d="M10 110C18 104 24 112 34 111C49 109 53 102 65 107C70 109 70 116 66 121C59 131 26 135 13 127C7 123 5 114 10 110Z" fill="#f8dfa4"/>
    <path d="M11 111C18 107 24 114 34 113C47 110 55 104 65 108M22 125C31 128 43 127 49 125" stroke="#fff5dc" strokeWidth="2.5" strokeLinecap="round"/>
    <g className="mt-scoop-splash" fill="#f5d18b" stroke="#d7a85e" strokeWidth=".8">
      <path d="M13 100C8 96 7 92 9 91C12 90 16 94 16 98Q16 101 13 100Z"/>
      <path d="M58 101C56 98 59 93 62 94C65 95 63 99 61 101Q59 103 58 101Z"/>
    </g>
  </svg>;
}

export function TeaSurface({ garnished = false, scoopCue = 0 }: { garnished?: boolean; scoopCue?: number }) {
  return <><CupSpoon key={scoopCue} scooping={scoopCue > 0}/><span className={`mt-foam${garnished ? ' is-creamy' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 800 28" preserveAspectRatio="none">
      <path d="M0 13C63 7 94 20 156 14S245 8 304 13S406 19 466 12S561 9 622 14S744 18 800 11V24C730 19 682 25 611 22S512 18 447 23S342 23 280 20S169 25 104 22S37 18 0 23Z" fill="#fff6e2" opacity=".7"/>
      <path d="M1 13C63 7 94 20 156 14S245 8 304 13S406 19 466 12S561 9 622 14S744 18 799 11" fill="none" stroke="#e7b660" strokeWidth="1" opacity=".5"/>
      {garnished && <>
        <path d="M9 17C87 11 121 25 197 17S310 12 377 18 470 13 529 14 644 23 711 18 770 14 790 16" fill="none" stroke="#fffdfa" strokeWidth="4" strokeLinecap="round" opacity=".88"/>
        <path d="M25 11c17-3 31-2 45-1m112 9c20-2 38-4 54-4m219 0c24-4 43-5 62-4m173 8c15 0 31-1 46-3" fill="none" stroke="#f0c982" strokeWidth="1.2" strokeLinecap="round" opacity=".56"/>
      </>}
    </svg>
  </span>
  {garnished && <svg className="hr-garnish" viewBox="0 0 116 74" aria-hidden="true" focusable="false">
    <path d="M73 31C71 14 84 4 103 6C101 21 88 31 73 31Z" fill="#a1b672" stroke="#718455" strokeWidth="2"/>
    <path d="M74 30 94 13" fill="none" stroke="#d4dfa7" strokeWidth="2" strokeLinecap="round"/>
    <path d="M63 49C40 47 31 27 38 11L91 35C84 48 74 52 63 49Z" fill="#fff1d7" stroke="#b96e62" strokeWidth="2"/>
    <path d="M63 43C47 41 39 25 42 18L83 37C78 43 72 46 63 43Z" fill="#efaaa3"/>
    <path d="M46 36 59 26 57 41M63 28 67 44M69 31 76 42" fill="none" stroke="#fff4dc" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="m12 42 17-10 18 8-1 20-17 8-17-8Z" fill="#f6bc60" stroke="#ba8539" strokeWidth="2" strokeLinejoin="round"/>
    <path d="m12 42 17 8 18-10-18-8Z" fill="#ffdf92"/>
    <path d="M29 50v18m-11-23 7 3" fill="none" stroke="#d39643" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M53 58c7 2 14 2 22-2" fill="none" stroke="#fff7de" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>}</>;
}

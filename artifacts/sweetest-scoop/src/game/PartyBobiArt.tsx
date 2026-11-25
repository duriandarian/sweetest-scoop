import { useId } from 'react';
import './party-bobi.css';

export type PartyBobiId = 'party-daniel' | 'party-amy';
export const PARTY_BOBI_NAMES: Record<PartyBobiId, string> = {
  'party-daniel': 'Main Character Bobi',
  'party-amy': 'Sweetheart Bobi',
};

export function isPartyBobi(value?: string | null): value is PartyBobiId {
  return value === 'party-daniel' || value === 'party-amy';
}

/** Only previews the look; the server assigns and locks it when a guest joins. */
export function previewPartyBobi(name: string): PartyBobiId | undefined {
  const key = name.normalize('NFKC').replace(/\p{Default_Ignorable_Code_Point}/gu, '').trim().toLowerCase();
  return key === 'daniel' ? 'party-daniel' : key === 'amy' ? 'party-amy' : undefined;
}

const heart = 'M0 5C-3 2-6 0-6-3c0-4 5-5 6-1 1-4 6-3 6 1 0 3-3 5-6 8Z';
const glint = 'M0-6 1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z';

function AmyCurls() {
  return <g data-party-curls="" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 38c-5-1-8-5-7-9-3-3-2-8 1-10-1-4 2-8 6-9 0-4 4-7 8-6 3-4 8-4 12-2 3-4 9-4 13-1 4-3 10-2 13 2 5-1 9 1 10 5 5 0 8 4 8 8 4 2 5 6 3 10 2 4 0 9-4 11 0 4-2 7-6 8l-2-12c-1-5-3-8-6-10-7-4-17-5-25-4-10 1-17 4-22 9l-1 13Z" fill="#302622" stroke="#281e1c" strokeWidth="1.55"/>
    <path d="M19 23c1-3 4-5 7-4m0-6c2-3 6-4 9-3m1-4c2-2 5-2 7-1m7 0c3-2 6-1 8 1m8 0c3 0 5 2 6 4m5 3c3 1 5 4 4 7" fill="none" stroke="#503b32" strokeWidth="2.25"/>
  </g>;
}

function AmySunglasses() {
  const templeAndBridge = 'M16 27h5m49 0h9M41 24.5h9m-9 4.5q4.5-3 9 0';
  return <g data-party-sunglasses="" strokeLinejoin="round" strokeLinecap="round">
    <path d={templeAndBridge} fill="none" stroke="#634632" strokeWidth="2.8"/>
    <path d={templeAndBridge} fill="none" stroke="#efbe70" strokeWidth="1.35"/>
    <g transform="translate(30.2 28.8) scale(1 .92)"><AmyLens/></g>
    <g transform="translate(60.2 28.8) scale(-1 .92)"><AmyLens/></g>
  </g>;
}

function AmyLens() {
  return <>
    <path d="M-11-5.6q10-2 21-.6 2.7.3 2.2 3.1l-1.1 4.7Q9 8 .2 8-8.5 8.4-10.8 2l-1.8-4.9q-.6-2.1 1.6-2.7Z" fill="#f2be75" stroke="#533228" strokeWidth="1.55"/>
    <path d="M-10.1-3.5q9-1.7 20.1-.6L9 .9Q7.5 5.9.2 5.9-6.8 6.2-8.8 1.4Z" fill="#b65e3f" stroke="#683a2b" strokeWidth=".85"/>
    <ellipse cx="-.6" cy="1" rx="2.05" ry="2.8" fill="#442821"/>
    <path d="m-7.8-2.4 2.9-.4" fill="none" stroke="#f5a377" strokeWidth="1.2"/>
  </>;
}

function AmyFace({ baseSrc }: { baseSrc: string }) {
  const id = useId();
  const blend = `url(#${id}-blend)`;
  // Sample nearby pearl texture to cover the original features before moving the face down.
  return <>
    <defs>
      <radialGradient id={`${id}-blend`}>
        <stop offset=".73" stopColor="white"/>
        <stop offset="1" stopColor="white" stopOpacity="0"/>
      </radialGradient>
      <mask id={`${id}-face`} maskUnits="userSpaceOnUse" x="17" y="24" width="56" height="26">
        <ellipse cx="42.8" cy="35" rx="13" ry="9" fill={blend}/>
        <ellipse cx="30.3" cy="33" rx="4.7" ry="5" fill={blend}/>
        <ellipse cx="60.2" cy="32.5" rx="4.7" ry="5" fill={blend}/>
        <ellipse cx="64.2" cy="41.4" rx="7.4" ry="7.1" fill={blend}/>
      </mask>
      <mask id={`${id}-left-cheek`} maskUnits="userSpaceOnUse" x="16" y="33" width="18" height="17">
        <ellipse cx="24.6" cy="42" rx="7.2" ry="7.2" fill={blend}/>
      </mask>
    </defs>
    <image href={baseSrc} y="-17" width="100" height="100" mask={`url(#${id}-face)`}/>
    <image href={baseSrc} x="-16" y="-12" width="100" height="100" mask={`url(#${id}-left-cheek)`}/>
    <g transform="translate(0 7)">
      <AmySunglasses/>
      <ellipse cx="24.6" cy="43" rx="4.2" ry="4" fill="#ffdab6"/>
      <ellipse cx="64.2" cy="43" rx="4.2" ry="4" fill="#ffdab6"/>
      <path d="M39 42q6.2 5.2 12.4 0" fill="none" stroke="#542d21" strokeWidth="1.8" strokeLinecap="round"/>
    </g>
  </>;
}

function PeaceHand({ transform }: { transform: string }) {
  return <g data-party-peace-hand="" transform={transform} stroke="#714631" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
    <path d="M-6 0-11-10q-1.5-3 1-4.2 2.8-1.4 4.4 1.3L-.6-4.2l-.3-9.4q0-3 2.7-3.3 2.8-.3 3.2 2.7l1 11.4q2.8.2 4.2 2.7c3.6 6.3-1.1 13.2-8.2 13.2C-5 13.1-9.7 9.4-9.5 4.7-9.5 2.5-8.1.8-6 0Z" fill="#edb97f"/>
    <path d="M-6 0q5-3 9 .7 1.6 1.8-.8 3.3L0 5q.7 2.5 4.7 2.8" fill="none"/>
    <path d="m-9-10 3.3 6.2m7.7-9.7.2 4.3" fill="none" stroke="#ffe0aa" strokeWidth="1.45"/>
  </g>;
}

function Volleyball({ transform, color }: { transform: string; color: string }) {
  return <g data-party-volleyball="" transform={transform} stroke="#704b3c" strokeWidth="1.35" strokeLinejoin="round" fill="none">
    <circle r="12" fill="#fff6dd"/>
    <path d="M-10-6c4 0 8 2 11 6 0 4-2 8-5 11M1 0C5-2 9-5 8-9"/>
    <path d="M-7-9c4 1 7 3 9 6M5 1c1 4 0 8-2 10M-11 2c3 0 6 3 6 6" stroke={color}/>
    <ellipse cx="-4" cy="-6" rx="2.8" ry="1.4" fill="#fff" stroke="none"/>
  </g>;
}

function MatchaCup() {
  return <g data-party-matcha="" transform="translate(18 77) rotate(-12)" stroke="#4b6740" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
    <path d="M-8-8H8L6 8q-6 3-12 0Z" fill="#96b86a"/>
    <path d="M-6 3q6-2 12 0L6 8q-6 3-12 0Z" fill="#e5e4bc" stroke="none"/>
    <path d="m-5-4 1 7" fill="none" stroke="#ebefc9" strokeWidth="1.45"/>
    <path d="M0 3c0-3 2-5 5-5-1 3-2 4-5 5Z" fill="#4b6740" stroke="none"/>
    <rect x="-9" y="-10" width="18" height="4.5" rx="2" fill="#fff7df"/>
  </g>;
}

function KartExhaust() {
  return <>
    <path d="M18 68 7 45q-2-5 4-7t9 2l11 24Z" fill="#363946"/>
    <path d="m9 46 6-2 11 22-4 2Z" fill="#545968" stroke="none"/>
    <path d="M8 45q-3-5 3-7t9 2l1 2q-7-1-13 3Z" fill="#ffcb58"/>
  </>;
}

function DanielKartBack() {
  return <g stroke="#242632" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
    <KartExhaust/>
    <g transform="translate(100 0) scale(-1 1)"><KartExhaust/></g>
    <path d="M24 50q2-8 12-8h28q10 0 12 8l6 27H18Z" fill="#314b78"/>
    <path d="M28 51q2-6 8-6h28q6 0 8 6" fill="none" stroke="#7087ac" strokeWidth="1.4"/>
  </g>;
}

function KartSidePod() {
  return <>
    <path d="m9 63 18-2 5 17-25 3Z" fill="#345a8f"/>
    <path d="m9 63 14-4 8 5 1 9-24 3Z" fill="#fff7eb"/>
    <path d="m10 63 13-4 8 5v4l-22 4Z" fill="#e9564e"/>
  </>;
}

function KartTire() {
  return <>
    <rect x="6" y="74" width="22" height="21" rx="6" fill="#30343e"/>
    <path d="M12 79v6m9-7v5" stroke="#575e6c"/>
    <ellipse cx="13" cy="88" rx="4" ry="5" fill="#efb841"/>
  </>;
}

function DanielKartFront() {
  return <g data-party-kart="" stroke="#292634" strokeWidth="1.65" strokeLinejoin="round" strokeLinecap="round">
    <KartSidePod/>
    <g transform="translate(100 0) scale(-1 1)"><KartSidePod/></g>
    <path d="M22 75q8-7 19-7h18q11 0 19 7l3 9H19Z" fill="#354667"/>
    <Volleyball transform="translate(73 67) rotate(17) scale(.86)" color="#4d9e90"/>
    <path d="M50 66v9" strokeWidth="3.6"/>
    <ellipse cx="50" cy="65" rx="11" ry="4.7" fill="#303442" strokeWidth="2.2"/>
    <ellipse cx="50" cy="64.5" rx="7.7" ry="1.9" fill="#66758d" stroke="none"/>
    <KartTire/>
    <g transform="translate(100 0) scale(-1 1)"><KartTire/></g>
    <path d="M13 84q10-4 19-1l10-5h16l10 5q9-3 19 1l4 6q-14 8-41 8t-41-8Z" fill="#345a8f"/>
    <path d="M13 82q10-4 19-1l10-6h16l10 6q9-3 19 1l4 5q-14 8-41 8t-41-8Z" fill="#fff7eb"/>
    <path d="M43 70h14q5 0 7 5l7 17q2 6-5 7H34q-7-1-5-7l7-17q2-5 7-5Z" fill="#b93b38"/>
    <path d="M43 70h14q5 0 7 5l6 15q2 6-5 6H35q-7 0-5-6l6-15q2-5 7-5Z" fill="#f25d54" stroke="#963533"/>
    <path d="M41 75q2-2 5-2h8q3 0 5 2" fill="none" stroke="#ff9380"/>
    <ellipse cx="50" cy="84" rx="9.5" ry="8" fill="#fff8eb" stroke="none"/>
    <path data-kart-monogram="D" d="M46 79h3.8c3.5 0 5.6 1.8 5.6 5s-2.1 5-5.6 5H46Zm2.8 2.4v5.2h1c1.8 0 2.8-.9 2.8-2.6s-1-2.6-2.8-2.6Z" fill="#cc302d" fillRule="evenodd" stroke="none"/>
  </g>;
}

function DanielCostume() {
  return <g data-costume="chef-kart-racer" stroke="#4e5947" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
    <g transform="translate(0 -1) scale(1 .73)">
      <path d="M28 24c-7-1-10-6-8-11 1-4 5-6 10-5 3-7 13-8 19-3 5-6 14-4 17 3 6-1 11 3 11 9s-4 9-11 9l-1 5H29Z" fill="#fff3d5"/>
      <path d="M32 23c10-2 23-2 33 0v6c-11-2-23-2-34 0Z" fill="#f3b954"/>
      <path d="M34 16c1-4 4-6 7-6m15 1 2 5" stroke="#dec198" fill="none"/>
    </g>
    <DanielKartFront/>
  </g>;
}

export function PartyBobiArt({ variant, baseSrc }: { variant: PartyBobiId; baseSrc: string }) {
  const amy = variant === 'party-amy';
  return <span className="bobi-party-stage" data-party-variant={variant} aria-hidden="true">
    <svg viewBox="0 0 100 100" className="bobi-party-background">
      {amy ? <g transform="translate(49 48)">
        <path d={heart} transform="scale(7.2)" fill="#f4b2c5" opacity=".69"/>
        <path d={heart} transform="scale(5.7)" fill="#fbd5de"/>
      </g> : <>
        <ellipse cx="49" cy="47" rx="46" ry="43" fill="#fff0c0" fillOpacity=".72"/>
        <ellipse cx="49" cy="47" rx="43" ry="40" fill="none" stroke="#de9f43" strokeWidth="1.4" strokeDasharray="3 3"/>
        <path d="M10 55C3 35 24 11 51 9c20-2 35 8 42 20M93 59C83 84 55 95 30 85" fill="none" stroke="#fff9dd" strokeWidth="3" strokeLinecap="round"/>
        <DanielKartBack/>
      </>}
    </svg>
    <img src={baseSrc} alt="" draggable={false}/>
    <svg viewBox="0 0 100 100" className="bobi-party-foreground">
      {amy ? <>
        <AmyCurls/>
        <AmyFace baseSrc={baseSrc}/>
        <PeaceHand transform="translate(23 57) rotate(-13) scale(.86)"/>
        <PeaceHand transform="translate(76 57) rotate(13) scale(-.86 .86)"/>
        <MatchaCup/>
        <Volleyball transform="translate(81 77) rotate(15) scale(.82)" color="#ad7653"/>
        <g className="bobi-party-sparks" stroke="#a45d63" strokeWidth="1.2" strokeLinejoin="round">
          <path d={heart} transform="translate(14 26) rotate(-22) scale(.91)" fill="#efa8ad"/>
          <path d={heart} transform="translate(86 23) rotate(24) scale(1.04)" fill="#e9959d"/>
          <path d={heart} transform="translate(92 41) rotate(-9) scale(.63)" fill="#f3b8b5"/>
        </g>
      </> : <>
        <DanielCostume/>
        <g className="bobi-party-sparks" stroke="#9d692a" strokeWidth="1.2" strokeLinejoin="round">
          <path d={heart} transform="translate(12 36) rotate(-23) scale(1.05)" fill="#ffac8a"/>
          <path d={heart} transform="translate(85 17) rotate(20) scale(.86)" fill="#f4c571"/>
          <path d={heart} transform="translate(9 56) rotate(-15) scale(.67)" fill="#f9bc83"/>
          <path d={glint} transform="translate(12 18) scale(.9)" fill="#fff1bd"/>
          <path d={glint} transform="translate(91 34) scale(.9)" fill="#fff5c9"/>
          <path d={glint} transform="translate(95 61) scale(.65)" fill="#fff5c9"/>
        </g>
      </>}
    </svg>
  </span>;
}

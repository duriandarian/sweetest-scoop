/** Small hand-drawn dessert ingredients; purely decorative and behind the photos. */
function Mango() {
  return <svg viewBox="0 0 70 72" fill="none">
    <path d="M15 48C8 29 28 12 49 17c17 5 11 33-7 40-11 5-23 1-27-9Z" fill="#f6b83e" stroke="#d98a28" strokeWidth="2"/>
    <path d="M20 43c-4-12 8-24 23-23 12 1 11 20-3 28-9 5-17 3-20-5Z" fill="#ffd573"/>
    <path d="m23 28 25 11m-29-3 22 13M33 22l-7 24m17-24-8 27" stroke="#eaa744" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M43 17C42 8 53 3 62 7c-3 8-10 13-19 10Z" fill="#a5be7b" stroke="#78945d" strokeWidth="1.8"/>
    <path d="m45 15 12-6" stroke="#78945d" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
function Pomelo() {
  return <svg viewBox="0 0 72 68" fill="none">
    <path d="M8 16c-5 25 7 43 29 43 19 0 31-18 27-39L8 16Z" fill="#f8e7cd" stroke="#daa08c" strokeWidth="2"/>
    <path d="M14 22c-2 19 8 31 23 31s25-14 22-28L14 22Z" fill="#edaaa2"/>
    <path d="m35 24 2 26m-5-26L19 42m20-17 15 18m-20-8-17-5m25 7 15-6" stroke="#fff0d8" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="m18 29 5 3m2 10 3 3m16 0 4-4m-6-12 4 2" stroke="#df8d8b" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
function Pearls({ tea = false }: { tea?: boolean }) {
  return <svg viewBox="0 0 68 64" fill="none">
    {[[20, 25, 12], [45, 20, 11], [37, 45, 13]].map(([x, y, r]) => <g key={x}>
      <circle cx={x} cy={y} r={r} fill={tea ? '#896043' : '#fff9e7'} stroke={tea ? '#67452f' : '#d8c8a0'} strokeWidth="1.8"/>
      <ellipse cx={x - 3} cy={y - 4} rx="4" ry="2.5" fill={tea ? '#c89d72' : '#fffef9'} transform={`rotate(-28 ${x - 3} ${y - 4})`}/>
    </g>)}
  </svg>;
}
const toppings = [
  { kind: 'mango', x: 7, y: 51, size: 58, rotation: -16, delay: -3 },
  { kind: 'pomelo', x: 91, y: 53, size: 66, rotation: 17, delay: -8 },
  { kind: 'sago', x: 10, y: 78, size: 48, rotation: -9, delay: -5 },
  { kind: 'mango', x: 84, y: 78, size: 46, rotation: 24, delay: -11 },
  { kind: 'boba', x: 34, y: 57, size: 43, rotation: 8, delay: -6 },
  { kind: 'sago', x: 73, y: 67, size: 40, rotation: -24, delay: -9 },
  { kind: 'pomelo', x: 3, y: 27, size: 40, rotation: -28, delay: -2 },
  { kind: 'mango', x: 96, y: 18, size: 45, rotation: 13, delay: -7 },
];

export function MenuToppings() {
  return <div className="pm-toppings" aria-hidden="true">
    <span className="pm-mango-wash"/>
    {toppings.map((t, i) => <span key={i} className={`pm-topping topping-${t.kind}`} style={{
      left: `${t.x}%`, top: `${t.y}%`, width: t.size,
      ['--food-rot' as string]: `${t.rotation}deg`, ['--food-delay' as string]: `${t.delay}s`,
      ['--food-duration' as string]: `${9 + i % 4 * 2}s`,
    }}>{t.kind === 'mango' ? <Mango/> : t.kind === 'pomelo' ? <Pomelo/> : <Pearls tea={t.kind === 'boba'}/>}</span>)}
  </div>;
}

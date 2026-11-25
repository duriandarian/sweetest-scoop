/** Small hand-drawn dessert ingredients; purely decorative and behind the photos. */
function Mango() {
  return <svg viewBox="0 0 70 72" fill="none">
    <path d="M15 48C8 29 28 12 49 17c17 5 11 33-7 40-11 5-23 1-27-9Z" fill="#f6b83e" stroke="#d98a28" strokeWidth="2"/>
    <path d="M20 43c-4-12 8-24 23-23 12 1 11 20-3 28-9 5-17 3-20-5Z" fill="#ffd573"/>
    <path d="M24 40c-2-6 2-11 7-12" stroke="#fff1c2" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="m23 28 25 11m-29-3 22 13M33 22l-7 24m17-24-8 27" stroke="#eaa744" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M43 17C42 8 53 3 62 7c-3 8-10 13-19 10Z" fill="#a5be7b" stroke="#78945d" strokeWidth="1.8"/>
    <path d="m45 15 12-6" stroke="#78945d" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
function Pomelo() {
  return <svg viewBox="0 0 72 68" fill="none">
    <path d="M8 16c-5 25 7 43 29 43 19 0 31-18 27-39L8 16Z" fill="#f8e7cd" stroke="#e0918f" strokeWidth="2"/>
    <path d="M14 22c-2 19 8 31 23 31s25-14 22-28L14 22Z" fill="#f2a0a6"/>
    <path d="m35 24 2 26m-5-26L19 42m20-17 15 18m-20-8-17-5m25 7 15-6" stroke="#fff0e2" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="m18 29 5 3m2 10 3 3m16 0 4-4m-6-12 4 2" stroke="#e07a86" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
function Taro() {
  return <svg viewBox="0 0 60 60" fill="none">
    <circle cx="30" cy="32" r="21" fill="#c9b3e6" stroke="#9479bf" strokeWidth="2"/>
    <circle cx="30" cy="32" r="14" fill="#ddd0f1"/>
    <path d="M22 26c3-3 7-4 11-3m-14 13c3 4 9 6 14 4" stroke="#a68ccf" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="25" cy="31" r="1.4" fill="#9479bf"/><circle cx="35" cy="35" r="1.2" fill="#9479bf"/><circle cx="33" cy="27" r="1" fill="#9479bf"/>
    <path d="M22 18c-4-1-5 1-4 3" stroke="#fffaf0" strokeWidth="2.4" strokeLinecap="round"/>
  </svg>;
}
function Matcha() {
  return <svg viewBox="0 0 60 60" fill="none">
    <path d="M14 22c11-8 22-8 33 0 3 3-1 6-4 6H18c-3 0-7-3-4-6Z" fill="#fff6e3" stroke="#d9b98a" strokeWidth="1.8"/>
    <path d="M13 27c2 16 8 24 17 24s15-8 17-24" fill="#9fbf6d" stroke="#6f8f45" strokeWidth="2"/>
    <path d="M20 33c5 2 15 2 20 0" stroke="#c4dc98" strokeWidth="2" strokeLinecap="round"/>
    <path d="M29 14c-1-5 2-9 7-9-1 5-3 8-7 9Z" fill="#7da452" stroke="#5f7a45" strokeWidth="1.4"/>
  </svg>;
}
function Pearls() {
  const pts = [[20, 25, 12], [45, 20, 11], [37, 45, 13]];
  return <svg viewBox="0 0 68 64" fill="none">
    {pts.map(([x, y, r]) => <g key={`${x}-${y}`}>
      <circle cx={x} cy={y} r={r} fill="#fff9e7" fillOpacity=".92" stroke="#e3c79a" strokeWidth="1.4"/>
      <ellipse cx={x - r * .3} cy={y - r * .32} rx={r * .32} ry={r * .2} fill="#fffef9" transform={`rotate(-28 ${x - r * .3} ${y - r * .32})`}/>
    </g>)}
  </svg>;
}
const toppings = [
  { kind: 'mango', x: 6, y: 49, size: 48, rotation: -16, delay: -3 },
  { kind: 'pomelo', x: 93, y: 53, size: 50, rotation: 17, delay: -8 },
  { kind: 'sago', x: 20, y: 74, size: 37, rotation: -9, delay: -5 },
  { kind: 'taro', x: 18, y: 12, size: 32, rotation: 6, delay: -12, desk: true },
  { kind: 'matcha', x: 80, y: 10, size: 34, rotation: 12, delay: -1, desk: true },
];
const art: Record<string, () => React.ReactElement> = {
  mango: Mango, pomelo: Pomelo, taro: Taro, matcha: Matcha, sago: Pearls,
};

export function MenuToppings() {
  return <div className="pm-toppings" aria-hidden="true">
    <span className="pm-wash pm-wash-mango"/>
    <span className="pm-wash pm-wash-pomelo"/>
    <span className="pm-wash pm-wash-taro"/>
    <span className="pm-wash pm-wash-matcha"/>
    {toppings.map((t, i) => { const Art = art[t.kind]; return <span key={i} className={`pm-topping topping-${t.kind}${t.desk ? ' is-desk' : ''}`} style={{
      top: `${t.y}%`, width: t.size, ['--food-x' as string]: `${t.x}%`,
      ['--food-rot' as string]: `${t.rotation}deg`, ['--food-delay' as string]: `${t.delay}s`,
      ['--food-duration' as string]: `${19 + (i % 5) * 2.6}s`,
      ['--food-range' as string]: `${.76 + (i % 3) * .12}`,
      ['--dx' as string]: `${i % 2 ? -1 : 1}`,
    }}><Art/></span>; })}
  </div>;
}

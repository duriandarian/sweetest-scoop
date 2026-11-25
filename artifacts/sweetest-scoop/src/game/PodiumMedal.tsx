import { useId } from 'react';

/** Original embossed medal artwork; kept separate from player avatars and score data. */
export function PodiumMedal({ place }: { place: 1 | 2 | 3 }) {
  const id = useId();
  const colors = place === 1 ? ['#fff1a1', '#f0bc25', '#ba8614']
    : place === 2 ? ['#f7f5e7', '#b9c3b4', '#7a897c']
    : ['#ffdaa1', '#d3944a', '#9a5d2e'];
  return <svg className="podium-medal" viewBox="0 0 80 92" aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={colors[0]}/><stop offset=".52" stopColor={colors[1]}/><stop offset="1" stopColor={colors[2]}/>
      </linearGradient>
    </defs>
    <path d="M24 54 18 84 32 77 40 87 43 58M41 58 49 87 56 76 69 80 56 52"
      fill={colors[1]} stroke={colors[2]} strokeWidth="2" strokeLinejoin="round"/>
    <circle cx="40" cy="35" r="28" fill={`url(#${id})`} stroke={colors[2]} strokeWidth="2"/>
    <circle cx="40" cy="35" r="22" fill="none" stroke={colors[0]} strokeWidth="2"/>
    <path d="M20 27a22 22 0 0 1 25-13" fill="none" stroke="#fffbea" strokeWidth="3" strokeLinecap="round" opacity=".8"/>
    <text x="40" y="46" textAnchor="middle" fill={colors[2]} fontSize="31" fontFamily="Georgia, serif" fontWeight="bold">{place}</text>
  </svg>;
}

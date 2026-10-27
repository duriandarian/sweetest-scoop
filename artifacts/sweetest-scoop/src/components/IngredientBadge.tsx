type Props = { kind: string };

export function IngredientBadge({ kind }: Props) {
  const palette: Record<string, { fill: string; accent: string }> = {
    snow:{fill:'#fff9ed',accent:'#d8c6af'}, berry:{fill:'#e98891',accent:'#a94e5b'}, mango:{fill:'#f1c05a',accent:'#dc8b34'}, taro:{fill:'#c292cb',accent:'#805d91'}, beans:{fill:'#9b5148',accent:'#62372f'}, mochi:{fill:'#f2dbbd',accent:'#c59b72'}, jelly:{fill:'#7d9b77',accent:'#466e59'}, lychee:{fill:'#f5d9ce',accent:'#c27570'}, pudding:{fill:'#efbd5d',accent:'#b87f35'}, boba:{fill:'#694334',accent:'#392923'},
  };
  const colors = palette[kind] ?? palette.snow;
  return <span className="ingredient-icon" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 32 32" fill="none">
    {kind === 'snow' && <><path d="m6 22 5-11 5 6 4-9 7 14H6Z" fill={colors.fill} stroke={colors.accent} strokeWidth="1.7" strokeLinejoin="round"/><path d="M10 22h14" stroke={colors.accent} strokeWidth="1.4" strokeLinecap="round"/></>}
    {kind === 'berry' && <><path d="M7 12c2-5 15-6 18 0 2 5-3 13-9 15-6-2-11-10-9-15Z" fill={colors.fill} stroke={colors.accent} strokeWidth="1.5"/><path d="m12 8 1-4 4 3 4-3 1 4" fill="#789068" stroke="#536e50" strokeWidth="1.4"/><path d="m12 14 1 1m5-2 1 1m-6 5 1 1m6-2 1 1" stroke="#ffe8b2" strokeWidth="1.4" strokeLinecap="round"/></>}
    {kind === 'mango' && <><path d="M7 20c0-8 8-14 17-12 2 8-3 17-12 17-4 0-5-2-5-5Z" fill={colors.fill} stroke={colors.accent} strokeWidth="1.5"/><path d="M19 8q3-5 7-4-1 5-6 7" fill="#769167" stroke="#566d4c" strokeWidth="1.4"/></>}
    {kind === 'taro' && <><path d="M6 19c0-8 6-14 13-12 7 2 8 10 5 16-4 6-18 3-18-4Z" fill={colors.fill} stroke={colors.accent} strokeWidth="1.6"/><path d="M12 12q4-4 9 1m-11 5q5-3 10 1" stroke="#e9ccea" strokeWidth="1.6" strokeLinecap="round"/></>}
    {kind === 'beans' && <>{[0,1,2,3,4].map(i=><ellipse key={i} cx={9+(i%3)*7} cy={11+Math.floor(i/3)*9} rx="4" ry="5.3" transform={`rotate(${i*15-20} ${9+(i%3)*7} ${11+Math.floor(i/3)*9})`} fill={i%2?colors.accent:colors.fill} stroke="#69443d" strokeWidth="1.3"/>)}</>}
    {kind === 'mochi' && <><rect x="5" y="8" width="10" height="10" rx="4" fill={colors.fill} stroke={colors.accent} strokeWidth="1.4"/><rect x="15" y="14" width="11" height="10" rx="4" fill="#fff1dc" stroke={colors.accent} strokeWidth="1.4"/><path d="M7 10q4-3 7 0m4 7q4-3 7 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></>}
    {kind === 'jelly' && <><path d="M7 10h18v12q-9 8-18 0V10Z" fill={colors.fill} stroke={colors.accent} strokeWidth="1.6"/><path d="M9 14h14M11 19h11" stroke="#c9d4a4" strokeWidth="1.4" strokeLinecap="round"/></>}
    {kind === 'lychee' && <><circle cx="16" cy="17" r="10" fill={colors.fill} stroke={colors.accent} strokeWidth="1.5"/><path d="M12 10q4 2 8 0m-9 10q5-4 10 1" stroke="#fff1e5" strokeWidth="1.5" strokeLinecap="round"/><path d="M16 7q0-4 4-5" stroke="#6f865d" strokeWidth="2" strokeLinecap="round"/></>}
    {kind === 'pudding' && <><path d="M8 14h16l-2 12H10L8 14Z" fill={colors.fill} stroke={colors.accent} strokeWidth="1.5"/><ellipse cx="16" cy="14" rx="8" ry="3" fill="#f8d888" stroke={colors.accent} strokeWidth="1.4"/><path d="M10 11q6-5 12 0" stroke="#b57939" strokeWidth="2" strokeLinecap="round"/></>}
    {kind === 'boba' && <><circle cx="10" cy="20" r="4" fill={colors.fill} stroke={colors.accent} strokeWidth="1.2"/><circle cx="19" cy="12" r="4" fill={colors.fill} stroke={colors.accent} strokeWidth="1.2"/><circle cx="22" cy="22" r="4" fill={colors.fill} stroke={colors.accent} strokeWidth="1.2"/><circle cx="10" cy="19" r="1" fill="#d8a671"/><circle cx="19" cy="11" r="1" fill="#d8a671"/></>}
  </svg></span>;
}

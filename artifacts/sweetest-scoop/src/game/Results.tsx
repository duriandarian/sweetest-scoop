import { useMemo, useState } from 'react';
import type { CatalogAnswer, Standing } from '@workspace/api-client-react';
import { Search } from 'lucide-react';
import { BobiAvatar } from './BobiAvatar';
import { PRIZES, fmtSecs, prizeFor } from './theme';
import './results-motion.css';

const SPRINKLES = [
  { l: '8%', s: '9px', c: '#f6efe0', t: '7.2s', d: '1.8s', x: '8px' },
  { l: '18%', s: '8px', c: '#f0b23f', t: '8.4s', d: '3.1s', x: '-10px', cube: true },
  { l: '31%', s: '6px', c: '#e9dcc4', t: '6.6s', d: '2.4s', x: '6px' },
  { l: '47%', s: '10px', c: '#f7c96a', t: '9.1s', d: '1.4s', x: '-6px', cube: true },
  { l: '62%', s: '7px', c: '#f3e6cc', t: '7.8s', d: '4.2s', x: '12px' },
  { l: '74%', s: '8px', c: '#e5899a', t: '8.8s', d: '2.0s', x: '-8px' },
  { l: '88%', s: '9px', c: '#f0b23f', t: '7.4s', d: '3.6s', x: '5px', cube: true },
];
export function NextHint({ last }: { last: boolean }) {
  return <p className="rm-next-hint" aria-hidden="true"><span/><span/><span/>{last ? 'Final podium is chilling' : 'Next scoop is ready when you are'}</p>;
}

const rank = (list: Standing[]) => list.slice().sort((a, b) => b.points - a.points || (a.elapsedMs ?? 1e12) - (b.elapsedMs ?? 1e12) || a.displayName.localeCompare(b.displayName));

export function Podium({ standings, title, testId }: { standings: Standing[]; title: string; testId: string }) {
  const top = rank(standings).slice(0, 3);
  if (!top.length) return <div className="g-empty" data-testid={`${testId}-empty`}>No guests have scored yet.</div>;
  const order = [top[1], top[0], top[2]];
  return <section className="podium" aria-label={title} data-testid={testId}>
    <span className="rm-sprinkle" aria-hidden="true">{SPRINKLES.map((s, i) => <i key={i} className={s.cube ? 'cube' : ''}
      style={{ left: s.l, ['--s' as string]: s.s, ['--c' as string]: s.c, ['--t' as string]: s.t, ['--dl' as string]: s.d, ['--x' as string]: s.x }}/>)}</span>
    <h3 className="g-kicker">{title}</h3>
    <div className="podium-row">
      {order.map((s, i) => s ? <div key={s.playerId} className={`podium-step step-${i === 1 ? 1 : i === 0 ? 2 : 3}`} data-testid={`${testId}-${s.playerId}`}>
        <BobiAvatar avatar={s.avatar} size={i === 1 ? 72 : 56}/>
        <strong>{s.displayName}</strong>
        <span className="podium-pts">{s.points}</span>
        <span className="podium-block">{i === 1 ? 1 : i === 0 ? 2 : 3}</span>
      </div> : <div key={i} className="podium-step is-blank"/>)}
    </div>
  </section>;
}

export function RoundBoard({ standings }: { standings: Standing[] }) {
  if (!standings.length) return <div className="g-empty">No guests at the table this round.</div>;
  return <ol className="board" data-testid="list-round-standings">
    {rank(standings).map((s, i) => {
      const answered = !!s.answer?.trim();
      const p = prizeFor(undefined, null);
      const matched = answered && (s.basePoints ?? 0) > 0;
      const prize = matched ? PRIZES.find(x => x.base === s.basePoints) ?? p : null;
      return <li key={s.playerId} data-testid={`row-round-${s.playerId}`}>
        <span className="board-rank">{i + 1}</span>
        <BobiAvatar avatar={s.avatar} size={38}/>
        <div className="board-main"><strong>{s.displayName}</strong>
          <span>{answered ? `"${s.answer}"` : 'No answer locked'}{answered && ` · ${fmtSecs(s.elapsedMs)}`}</span></div>
        <div className="board-pts">
          {prize ? <em style={{ ['--pc' as string]: prize.color, ['--pi' as string]: prize.ink }}>{prize.name}</em> : <em className="is-none">{answered ? 'Not in the bank' : 'Skipped'}</em>}
          <b>{s.points}</b><small>{s.basePoints ?? 0} + {s.speedBonus ?? 0} speed</small>
        </div>
      </li>;
    })}
  </ol>;
}

export function TotalBoard({ standings }: { standings: Standing[] }) {
  return <ol className="board is-total" data-testid="list-total-standings">
    {rank(standings).map((s, i) => <li key={s.playerId}><span className="board-rank">{i + 1}</span><BobiAvatar avatar={s.avatar} size={34}/><div className="board-main"><strong>{s.displayName}</strong><span>{s.discoveries} {s.discoveries === 1 ? 'prize' : 'prizes'}</span></div><div className="board-pts"><b>{s.points}</b></div></li>)}
  </ol>;
}

const PAGE = 60;
const norm = (x?: string | null) => (x ?? '').trim().toLowerCase();
export function Catalog({ answers, mine }: { answers: CatalogAnswer[]; mine?: string | null }) {
  const [filter, setFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const counts = useMemo(() => { const c: Record<string, number> = {}; answers.forEach(a => { const n = prizeFor(a.tier, a.depth).name; c[n] = (c[n] ?? 0) + 1; }); return c; }, [answers]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return answers.filter(a => (filter === 'all' || prizeFor(a.tier, a.depth).name === filter) && (!needle || a.answer.toLowerCase().includes(needle)))
      .sort((a, b) => b.depth - a.depth || a.answer.localeCompare(b.answer));
  }, [answers, filter, q]);
  if (!answers.length) return <div className="g-empty">The answer bank for this round is not available.</div>;
  const pick = (f: string) => { setFilter(f); setLimit(PAGE); };
  const tiers = PRIZES.slice().sort((a, b) => b.depth - a.depth);
  return <section className="kat" data-testid="section-catalog">
    <h3 className="g-kicker">Every answer in the bank</h3>
    <div className="kat-chips" role="tablist">
      <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => pick('all')} data-testid="filter-all">All <span>{answers.length}</span></button>
      {tiers.map(p => <button key={p.name} role="tab" aria-selected={filter === p.name} className={filter === p.name ? 'on' : ''} style={{ ['--pc' as string]: p.color, ['--pi' as string]: p.ink }} onClick={() => pick(p.name)} data-testid={`filter-${p.name.replace(' ', '-').toLowerCase()}`}>{p.name} <span>{counts[p.name] ?? 0}</span></button>)}
    </div>
    <label className="kat-search"><Search size={17}/><input data-testid="input-catalog-search" placeholder="Search all answers..." value={q} onChange={e => { setQ(e.target.value); setLimit(PAGE); }}/></label>
    {list.length ? <ul className="kat-list">{list.slice(0, limit).map((a, i) => { const p = prizeFor(a.tier, a.depth); const isMine = !!mine && norm(mine) === norm(a.answer); return <li key={`${a.answer}-${i}`} className={`${a.submitted ? 'is-picked' : ''} ${isMine ? 'is-mine' : ''}`} style={{ ['--pc' as string]: p.color, ['--pi' as string]: p.ink }} data-testid={`row-catalog-${i}`}>
      <span className="kat-mark" title={p.name} aria-label={p.name}>{p.depth + 1}</span>
      <span className="kat-ans"><b>{a.answer}</b><small>{p.name}{a.submittedCount ? ` · picked ${a.submittedCount}x` : ''}{isMine ? ' · your answer' : ''}</small></span>
      <span className="kat-pts">+{a.basePoints}</span></li>; })}</ul>
      : <div className="g-empty">Nothing matches that search.</div>}
    <div className="kat-foot"><span>{Math.min(limit, list.length)} of {list.length} answers</span>
      {list.length > limit && <button className="g-btn g-btn-soft" onClick={() => setLimit(l => l + PAGE * 2)} data-testid="button-catalog-more">Show more · {list.length - limit} left</button>}</div>
  </section>;
}

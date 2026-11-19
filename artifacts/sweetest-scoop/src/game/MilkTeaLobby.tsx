import { useEffect, useMemo, useRef, useState } from 'react';
import { BobiAvatar } from './BobiAvatar';
import { TeaBackdrop, TeaSurface } from './TeaBackdrop';
import type { PlayerLike } from './theme';
import './milk-tea.css';

/** Pure: guests only, stable order by first-seen sequence (falls back to server order). */
export function orderGuests(players: PlayerLike[], seen: Map<string, number>): PlayerLike[] {
  return players
    .filter(p => !p.isHost)
    .map((p, i) => ({ p, k: seen.get(p.id) ?? Number.MAX_SAFE_INTEGER - 1000 + i }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.p);
}

/** Pure: deterministic per-id float offsets so a Bobi keeps its personality across polls. */
export function driftFor(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const u = (n: number) => ((h >>> n) & 255) / 255;
  return { delay: -(u(0) * 4).toFixed(2), dur: (3.4 + u(8) * 2).toFixed(2), tilt: ((u(16) - 0.5) * 8).toFixed(1), lift: (u(24) * 10).toFixed(0) };
}

export function MilkTeaLobby({ players, isHost }: { players: PlayerLike[]; isHost: boolean }) {
  const seen = useRef(new Map<string, number>());
  const seq = useRef(0);
  const first = useRef(true);
  const arrivalTimers = useRef(new Set<number>());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState('');
  useEffect(() => () => {
    arrivalTimers.current.forEach(t => window.clearTimeout(t));
    arrivalTimers.current.clear();
  }, []);

  const ids = players.filter(p => !p.isHost).map(p => p.id).join('|');
  useEffect(() => {
    const newcomers: string[] = [];
    for (const p of players) {
      if (p.isHost || seen.current.has(p.id)) continue;
      seen.current.set(p.id, seq.current++);
      newcomers.push(p.id);
    }
    if (first.current) { first.current = false; return; } // don't splash everyone already seated on mount
    if (!newcomers.length) return;
    const names = players.filter(p => newcomers.includes(p.id)).map(p => p.displayName);
    setAnnounce(`${names.join(', ')} dropped into the milk tea.`);
    setFresh(prev => new Set([...prev, ...newcomers]));
    const t = window.setTimeout(() => {
      setFresh(prev => { const n = new Set(prev); newcomers.forEach(id => n.delete(id)); return n; });
      arrivalTimers.current.delete(t);
    }, 2600);
    arrivalTimers.current.add(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const guests = useMemo(() => orderGuests(players, seen.current), [players, ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const host = players.find(p => p.isHost);
  const n = guests.length;
  const size = n > 30 ? 'is-many' : n > 12 ? 'is-some' : 'is-few';

  return <section className={`mt ${size}`} aria-labelledby="mt-title" data-testid="section-milk-tea">
    <header className="mt-head">
      <div>
        <p className="g-kicker">The shared cup</p>
        <h2 id="mt-title" className="mt-title">{n ? <>{n} {n === 1 ? 'Bobi is' : 'Bobis are'} <i>steeping</i>.</> : <>The tea is <i>poured</i>.</>}</h2>
      </div>
      {host && <p className="mt-host" data-testid="text-host-barista"><span>Barista</span>{host.displayName}{isHost ? ' (you)' : ''}</p>}
    </header>

    <div className="mt-glass">
      <span className="mt-straw" aria-hidden="true"/>
      <TeaSurface/>
      <div className="mt-tea">
        <TeaBackdrop/>
        {n === 0 ? <div className="mt-empty" data-testid="status-tea-empty">
          <p className="mt-empty-line">Warm, sweet, and waiting.</p>
          <p className="g-sub">Each guest who joins drops their Bobi right in here.</p>
        </div> : <ul className="mt-grid" data-testid="list-tea-bobis">
          {guests.map(p => {
            const d = driftFor(p.id);
            return <li key={p.id} className={`mt-cell ${fresh.has(p.id) ? 'is-new' : ''}`} data-testid={`tea-bobi-${p.id}`}
              style={{ ['--d' as string]: `${d.delay}s`, ['--dur' as string]: `${d.dur}s`, ['--tilt' as string]: `${d.tilt}deg`, ['--lift' as string]: `${d.lift}px` }}>
              <span className="mt-ripple" aria-hidden="true"/>
              <span className="mt-float"><BobiAvatar avatar={p.avatar} className="mt-bobi" size={72}/></span>
              <span className="mt-name" title={p.displayName}>{p.displayName}</span>
            </li>;
          })}
        </ul>}
      </div>
    </div>
    <p className="mt-sr" aria-live="polite" role="status">{announce}</p>
  </section>;
}

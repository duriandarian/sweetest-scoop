import { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { BobiAvatar } from './BobiAvatar';
import { TeaBackdrop, TeaSurface } from './TeaBackdrop';
import { RoundMusic } from './RoundMusic';
import { driftFor } from './MilkTeaLobby';
import type { Room } from './theme';
import './milk-tea.css';
import './host-round.css';

/** Host projector view while guests answer. Shows who has locked in, never what. */
export function HostRound({ room, remainingMs }: { room: Room; remainingMs: number | null }) {
  const guests = useMemo(() => room.players.filter(p => !p.isHost), [room.players]);
  const answered = guests.filter(g => g.hasAnswered === true);
  const waiting = guests.filter(g => g.hasAnswered !== true);
  const total = guests.length;
  const count = answered.length;

  // arrival order + fresh set, keyed by round; first observation does not replay
  const order = useRef(new Map<string, number>());
  const seq = useRef(0);
  const known = useRef<Set<string> | null>(null);
  const timers = useRef(new Set<number>());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState('');
  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

  const key = `${room.round}:${answered.map(a => a.id).sort().join('|')}`;
  useEffect(() => {
    const ids = answered.map(a => a.id);
    if (known.current === null) {
      known.current = new Set(ids);
      ids.forEach(id => order.current.set(id, seq.current++));
      return;
    }
    const newly = ids.filter(id => !known.current!.has(id));
    newly.forEach(id => { known.current!.add(id); order.current.set(id, seq.current++); });
    if (!newly.length) return;
    setAnnounce(`${answered.filter(a => newly.includes(a.id)).map(a => a.displayName).join(', ')} locked in.`);
    setFresh(prev => new Set([...prev, ...newly]));
    const t = window.setTimeout(() => { setFresh(prev => { const n = new Set(prev); newly.forEach(id => n.delete(id)); return n; }); timers.current.delete(t); }, 2400);
    timers.current.add(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const inCup = answered.slice().sort((a, b) => (order.current.get(a.id) ?? 1e9) - (order.current.get(b.id) ?? 1e9));
  const many = total > 24;

  const seconds = remainingMs === null ? null : Math.max(0, Math.ceil(remainingMs / 1000));
  return <div className={`hr ${many ? 'is-many' : ''} ${seconds !== null && seconds <= 10 ? 'is-urgent' : ''}`} data-testid="host-round">
    <div className="hr-prompt">
      <p className="g-kicker">Round {room.round} of {room.questionCount}</p>
      <h1 data-testid="text-question">{room.currentQuestion}</h1>
      <div className="hr-meter">
        <div className="hr-clock" role="timer" aria-label={seconds === null ? 'Waiting for timer' : `${seconds} seconds remaining`} data-testid="text-host-countdown">{seconds === null ? '—' : seconds}<small>seconds to lock in</small></div>
        <span className="hr-count" data-testid="text-submitted-count">{count} / {total}<small>guests locked in</small></span>
        <span className="hr-bar" aria-hidden="true"><i style={{ ['--f' as string]: total ? count / total : 0 }}/></span>
      </div>
    </div>
    <RoundMusic remainingMs={remainingMs}/>

    <section className="mt is-some" aria-label="Who has answered">
      <div className="mt-glass">
        <span className="mt-straw" aria-hidden="true"/>
        <TeaSurface/>
        {waiting.length > 0 && <div>
          <p className="hr-rim-label">Still thinking · {waiting.length}</p>
          <ul className="hr-rim" data-testid="list-waiting">
          {waiting.map(g => <li key={g.id} data-testid={`status-waiting-${g.id}`}><BobiAvatar avatar={g.avatar} size={28}/><span>{g.displayName}</span></li>)}
          </ul>
        </div>}
        <div className="mt-tea">
          <TeaBackdrop/>
          {total > 0 && waiting.length === 0 && <p className="hr-all" data-testid="status-all-answered">Every Bobi is in. Results open when the timer ends.</p>}
          {inCup.length === 0 ? <div className="hr-empty" data-testid="status-none-answered">
            <p>{total ? 'The cup is waiting for its first Bobi.' : 'No guests at the table yet.'}</p>
          </div> : <ul className="mt-grid" data-testid="list-answered">
            {inCup.map(g => {
              const d = driftFor(g.id);
              return <li key={g.id} className={`mt-cell ${fresh.has(g.id) ? 'is-new' : ''}`} data-testid={`status-answered-${g.id}`}
                style={{ ['--d' as string]: `${d.delay}s`, ['--dur' as string]: `${d.dur}s`, ['--tilt' as string]: `${d.tilt}deg`, ['--lift' as string]: `${d.lift}px` }}>
                <span className="mt-ripple" aria-hidden="true"/>
                <span className="mt-float"><BobiAvatar avatar={g.avatar} className="mt-bobi" size={many ? 54 : 72}/></span>
                <span className="hr-tick" aria-hidden="true"><Check size={12} strokeWidth={3}/></span>
                <span className="mt-name" title={g.displayName}>{g.displayName}</span>
              </li>;
            })}
          </ul>}
        </div>
      </div>
      <p className="mt-sr" aria-live="polite" role="status">{announce}</p>
    </section>
    <p className="hr-foot" data-testid="status-host">Answers stay hidden until the timer ends. Then everyone sees the podium together.</p>
  </div>;
}

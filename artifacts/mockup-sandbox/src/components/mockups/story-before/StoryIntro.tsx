import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Pause, Play, RotateCcw } from 'lucide-react';
import { memories, storyQuestion, STORY_CHAPTER, STORY_DURATION, STORY_GUESTS, STORY_INTRO } from './storyData';
import './_group.css';

const WORLD = 1600; // svg units tall, 400 wide
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x: number) => x * x * (3 - 2 * x);

// winding cavity centerline: x as function of depth (svg units)
const cx = (y: number) => 200 + Math.sin(y / 170) * 48 + Math.sin(y / 61) * 9;

function cavityPath(depth: number) {
  const top = 120;
  const end = Math.max(top + 4, depth);
  const left: string[] = [];
  const right: string[] = [];
  for (let y = top; y <= end; y += 16) {
    const w = 46 + Math.sin(y / 23) * 9 + Math.cos(y / 41) * 7;
    left.push(`${(cx(y) - w).toFixed(1)},${y}`);
    right.unshift(`${(cx(y) + w).toFixed(1)},${y}`);
  }
  const tipW = 40;
  return `M${left.join(' L')} Q${cx(end) - tipW},${end + 34} ${cx(end)},${end + 38} Q${cx(end) + tipW},${end + 34} ${right.join(' L')} Z`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function StoryIntro({ onJoin }: { onJoin: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (reduced || !playing) { last.current = null; return; }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current !== null) {
        const dt = now - last.current;
        setT(prev => {
          const next = Math.min(STORY_DURATION, prev + dt);
          if (next >= STORY_DURATION) setPlaying(false);
          return next;
        });
      }
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const done = t >= STORY_DURATION;
  const chapterRaw = (t - STORY_INTRO) / STORY_CHAPTER;
  const chapter = clamp(Math.floor(chapterRaw), 0, memories.length - 1);
  const local = t < STORY_INTRO ? 0 : (t - STORY_INTRO - chapter * STORY_CHAPTER);
  const mem = memories[chapter];
  const typed = t < STORY_INTRO ? '' : mem.answer.slice(0, Math.floor(clamp(local / 2000) * mem.answer.length));
  const showCount = t >= STORY_INTRO && local > 2300;

  // continuous descent: piecewise-eased toward each photo, never stopping fully
  const depthFrac = useMemo(() => {
    const stops = [0.06, ...memories.map(m => m.depth)];
    if (t < STORY_INTRO) return stops[0] + 0.03 * (t / STORY_INTRO);
    const i = clamp(Math.floor(chapterRaw), 0, memories.length - 1);
    const p = clamp(chapterRaw - i);
    const from = i === 0 ? stops[0] + 0.03 : stops[i];
    const to = stops[i + 1];
    return from + (to - from) * (0.75 * ease(clamp(p / 0.62)) + 0.25 * p);
  }, [t, chapterRaw]);

  const tipY = 120 + depthFrac * (WORLD - 200);
  const scoop = Math.sin(t / 260);
  const spoonX = cx(tipY);
  const camera = clamp(depthFrac * WORLD - 300, 0, WORLD - 640) / WORLD;

  const replay = () => { setT(0); setPlaying(true); };

  if (reduced) return <section className="story story-static panel" aria-label="Daniel and Amy, a few memories">
    <div className="story-head"><span className="preview-tag">Story preview</span><button className="btn btn-primary" onClick={onJoin}>Join the game <ArrowDown size={16}/></button></div>
    <h2 className="story-title">A few memories, under the ice.</h2>
    <p className="story-lede">In the game, the fewer people who match your answer, the deeper the spoon digs.</p>
    <ol className="static-grid">{memories.map((m, i) => <li key={m.src}><img src={m.src} alt={m.alt} loading="lazy"/><span>{String(i + 1).padStart(2, '0')} · example: “{m.answer}” · {m.matched} of {STORY_GUESTS} match</span></li>)}</ol>
  </section>;

  return <section className="story panel" aria-label="Daniel and Amy story introduction" aria-roledescription="autoplay preview">
    <div className="story-stage">
      <div className="story-world" style={{ transform: `translate3d(0, ${-camera * 100}%, 0)` }}>
        <svg className="story-ice" viewBox={`0 0 400 ${WORLD}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="st-ice" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#fffaf0"/><stop offset=".25" stopColor="#f9e8e6"/><stop offset=".5" stopColor="#f6e2c4"/><stop offset=".75" stopColor="#ecdcef"/><stop offset="1" stopColor="#e9cfa8"/>
            </linearGradient>
            <radialGradient id="st-hole" cx=".5" cy=".3" r=".8"><stop stopColor="#8d604a"/><stop offset=".6" stopColor="#b88b6c"/><stop offset="1" stopColor="#d9b993"/></radialGradient>
            <pattern id="st-flake" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="8" cy="10" r="2" fill="#fff" opacity=".8"/><circle cx="28" cy="30" r="1.4" fill="#fff" opacity=".7"/><circle cx="31" cy="8" r="1" fill="#d9a9b0" opacity=".4"/></pattern>
          </defs>
          <path d={`M14 140 Q60 30 200 40 Q340 30 386 140 L386 ${WORLD} L14 ${WORLD} Z`} fill="url(#st-ice)" stroke="#684c41" strokeWidth="4"/>
          <rect x="14" y="60" width="372" height={WORLD} fill="url(#st-flake)"/>
          {[360, 700, 1040, 1380].map((y, i) => <path key={y} d={`M18 ${y} Q110 ${y + 18} 200 ${y + 4} T382 ${y + 10}`} fill="none" stroke={['#f2b3b8', '#f2cf7c', '#c8aed8', '#d9a06f'][i]} strokeWidth="6" strokeLinecap="round" opacity=".55"/>)}
          {Array.from({ length: 18 }, (_, i) => <circle key={i} cx={40 + ((i * 97) % 320)} cy={200 + i * 78} r={6 + (i % 3) * 3} fill={['#e9878f', '#f0bf58', '#c889cf', '#5d3b33', '#f3d9b8'][i % 5]} stroke="#684c41" strokeWidth="2" opacity=".85"/>)}
          <path d={cavityPath(tipY)} fill="url(#st-hole)" stroke="#a37a5c" strokeWidth="3" strokeLinejoin="round"/>
          <path d={cavityPath(tipY)} fill="none" stroke="#fff4e2" strokeWidth="2" opacity=".6" transform="translate(-3 -3)"/>
        </svg>
        {memories.map((m, i) => {
          const revealed = tipY >= 120 + m.depth * (WORLD - 200) - 40;
          return <figure key={m.src} className={`story-photo ${m.side} ${revealed ? 'is-found' : ''} ${i === chapter ? 'is-current' : ''}`} style={{ top: `${(120 + m.depth * (WORLD - 200)) / WORLD * 100}%`, ['--tilt' as string]: `${m.tilt}deg` }}>
            <img src={m.src} alt={m.alt}/>
          </figure>;
        })}
        <div className="story-spoon" style={{ left: `${spoonX / 4}%`, top: `${tipY / WORLD * 100}%`, transform: `translate(-30%, -88%) rotate(${28 + scoop * 16}deg) translateY(${scoop * 4}%)` }} aria-hidden="true">
          <svg viewBox="0 0 150 250" fill="none"><defs><linearGradient id="st-wood" x1="0" y1="0" x2="1" y2=".2"><stop stopColor="#a66c43"/><stop offset=".4" stopColor="#d8a16a"/><stop offset="1" stopColor="#8d5b3e"/></linearGradient></defs>
            <g transform="rotate(180 75 125)"><path d="M72 91 126 210q8 20-6 27-13 7-22-11L49 112" fill="url(#st-wood)" stroke="#654938" strokeWidth="5" strokeLinejoin="round"/><ellipse cx="54" cy="69" rx="33" ry="46" transform="rotate(-22 54 69)" fill="url(#st-wood)" stroke="#654938" strokeWidth="5"/><ellipse cx="53" cy="68" rx="19" ry="29" transform="rotate(-22 53 68)" fill="#fff8ea" stroke="#e8bc85" strokeWidth="2"/></g>
          </svg>
        </div>
      </div>
      <div className="story-fade" aria-hidden="true"/>
    </div>

    <div className="story-card">
      <div className="story-head">
        <span className="preview-tag">Scripted preview · example answers</span>
        <div className="story-controls">
          {done ? <button className="icon-btn" onClick={replay} aria-label="Replay story"><RotateCcw size={15}/></button>
            : <button className="icon-btn" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause story' : 'Play story'}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button>}
          <button className="btn btn-primary story-join" onClick={onJoin} data-testid="button-story-join">{done ? 'Join the game' : 'Skip to game'} <ArrowDown size={15}/></button>
        </div>
      </div>
      {done ? <div className="story-final arrive">
        <h2 className="story-title">Now it’s your turn<br/><em>to dig.</em></h2>
        <p className="story-lede">Everyone holds a different piece of Daniel and Amy. Answer something only you would say, and watch the spoon go deep.</p>
      </div> : <>
        <p className="section-kicker">{storyQuestion}</p>
        <div className="story-typed" aria-live="polite"><span>{typed}</span><i className="caret"/></div>
        <div className={`story-meter ${showCount ? 'on' : ''}`}>
          <div className="dots">{Array.from({ length: STORY_GUESTS }, (_, i) => <span key={i} className={i < mem.matched ? 'match' : ''}/>)}</div>
          <p><strong>{mem.matched} of {STORY_GUESTS}</strong> {mem.matched === 1 ? 'guest said it. Only you.' : 'guests said the same.'} {mem.matched > 6 ? 'A shallow scoop.' : mem.matched > 2 ? 'Deeper now.' : 'All the way down.'}</p>
        </div>
        <p className="story-rule">Fewer matching answers, deeper spoon. Illustration only, nothing is scored here.</p>
        <div className="story-progress"><span style={{ transform: `scaleX(${t / STORY_DURATION})` }}/></div>
      </>}
    </div>
  </section>;
}

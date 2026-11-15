import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Pause, Play, RotateCcw } from 'lucide-react';
import { memories, BOBI_INTRO_LINE, BOBI_FINAL_LINE, TIER_COLOR, storyQuestion, STORY_TIERS, TOTAL, END } from './storyData';
import { bobiPose, bubblePose, cameraAt, cameraY, clamp, depthProgress, photoPos, photoReveal, uiAt, type Ui } from './storyChoreo';
import { MangoDrink, type DrinkRefs } from './MangoDrink';
import { Bobi } from './Bobi';
import './story.css';


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

/** dev-only frame seek: ?storyT=12.5 opens the intro paused at that second. Stripped from production builds. */
function devSeek(): number | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('storyT');
  return v === null || Number.isNaN(Number(v)) ? null : clamp(Number(v), 0, TOTAL);
}

export function StoryIntro({ onJoin }: { onJoin: () => void }) {
  const reduced = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);
  const refs = useRef<DrinkRefs>({ cam: null, photos: [] });
  const bobiRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  const seek = useRef(devSeek());
  const timeRef = useRef(seek.current ?? 0);
  const [playing, setPlaying] = useState(seek.current === null);
  const [ui, setUi] = useState<Ui>(() => uiAt(timeRef.current));
  const uiKey = useRef('');
  const cache = useRef<Record<string, string>>({});

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const next = { w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) };
      sizeRef.current = next; setSize(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback((t: number) => {
    const { w, h } = sizeRef.current;
    const R = refs.current;
    if (!w || !R.cam) return;
    const set = (key: string, el: Element | null, attr: string, val: string) => {
      if (!el || cache.current[key] === val) return;
      cache.current[key] = val; el.setAttribute(attr, val);
    };

    const cam = cameraAt(t, w, h);
    const ox = w / 2 - cam.x * cam.z; const oy = h * cam.fy - cam.y * cam.z;
    R.cam.setAttribute('transform', `translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${cam.z.toFixed(5)})`);
    memories.forEach((_, c) => {
      const v = photoReveal(c, t);
      set(`ph${c}`, R.photos[c], 'style', `opacity:${v.toFixed(3)}`);
    });
    const bp = bobiPose(t, w, h);
    if (bobiRef.current) {
      bobiRef.current.style.transform = `translate(${bp.x.toFixed(1)}px, ${bp.y.toFixed(1)}px)`;
      bobiRef.current.style.width = `${bp.size}px`;
      const bb = bubblePose(bp, w);
      const st = bobiRef.current.style;
      st.setProperty('--bub-l', `${bb.left.toFixed(1)}px`); st.setProperty('--bub-t', `${bb.top}px`);
      st.setProperty('--bub-w', `${bb.w}px`); st.setProperty('--bub-h', `${bb.h}px`); st.setProperty('--bub-tail', `${bb.tail.toFixed(1)}px`);
    }
    if (gaugeRef.current) gaugeRef.current.style.transform = `scaleY(${depthProgress(t).toFixed(3)})`;
    if (depthRef.current) depthRef.current.style.transform = `translateY(${(clamp(cameraY(t) / cameraY(TOTAL)) * 100).toFixed(2)}%)`;
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${clamp(t / END)})`;
    const next = uiAt(t);
    const key = `${next.chapter}|${next.typed}|${next.meter}|${next.done}|${next.intro}`;
    if (key !== uiKey.current) { uiKey.current = key; setUi(next); }
  }, []);

  useEffect(() => { cache.current = {}; draw(reduced ? TOTAL : timeRef.current); }, [size, draw, reduced]);

  useEffect(() => {
    if (reduced || !playing) return;
    let raf = 0; let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) timeRef.current = Math.min(TOTAL, timeRef.current + Math.min(0.05, (now - last) / 1000));
      last = now;
      draw(timeRef.current);
      if (timeRef.current >= TOTAL) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, draw]);

  const replay = () => { timeRef.current = 0; cache.current = {}; draw(0); setPlaying(true); };
  const ended = !playing && timeRef.current >= TOTAL;
  const view = reduced ? uiAt(TOTAL) : ui;
  const mem = memories[view.chapter];
  const line = view.done ? BOBI_FINAL_LINE : view.intro ? BOBI_INTRO_LINE : view.meter ? mem.comment : 'Ooh, what will they say?';
  const typed = view.done ? mem.answer : mem.answer.slice(0, view.typed);
  return <section className={`story-scene ${reduced ? 'is-static' : ''} ${!playing ? 'is-paused' : ''}`} aria-label="Bobi the boba pearl guides a drift down through a mango sago drink and four memories" aria-roledescription="autoplay preview">
    <div className="scene-stage" ref={stageRef}>
      <div className="scene-interior">
        {size.w > 0 && <MangoDrink w={size.w} h={size.h} refs={refs}/>}
      </div>
    </div>
    <header className="scene-brand">
      <span className="scene-names">Daniel <i>+</i> Amy</span>
      <span className="scene-place">Meet Fresh</span>
    </header>
    <div className="scene-depth" aria-hidden="true">
      <div className="scene-depth-track">
        {memories.map((_, c) => <i key={c} className={c === view.chapter ? 'on' : c < view.chapter ? 'past' : ''} style={{ top: `${(clamp(photoPos(c).y / cameraY(TOTAL)) * 100).toFixed(1)}%` }}><em>{memories[c].date}</em></i>)}
        <span className="scene-depth-mark" ref={depthRef}/>
      </div>
    </div>
    <div className={`scene-bobi ${view.done ? 'is-done' : ''}`} ref={bobiRef}>
      <div className="scene-bobi-float"><Bobi mood={view.done ? 'cheer' : view.intro ? 'wave' : 'guide'}/></div>
      <p className="scene-bubble" aria-live="polite" data-testid="text-bobi-speech" key={line}>{line}</p>
      <div className="scene-bobi-gauge" aria-hidden="true"><span ref={gaugeRef}/></div>
    </div>
    <div className={`scene-chapter ${view.done || view.intro ? 'is-hidden' : ''}`} aria-hidden="true">{String(view.chapter + 1).padStart(2, '0')}<span>/04</span></div>

    {/* fixed position and fixed reserved height for the whole playback; only the contents swap */}
    <div className={`scene-card ${view.done ? 'is-done' : view.intro ? 'is-intro' : ''}`}>
      <div className="scene-pane scene-hello" aria-hidden={!view.intro}>
        <span className="scene-tag">Scripted preview · example answers</span>
        <h2>Meet Bobi</h2>
        <p className="scene-hello-sub">Your little boba guide.</p>
        <p className="scene-hello-rule">Rarer answers take us deeper.</p>
      </div>
      <div className="scene-pane scene-play" aria-hidden={view.done || view.intro}>
        <span className="scene-tag">Scripted preview · example answers</span>
        <h2 className="scene-question">{storyQuestion}</h2>
        <div className="scene-input">
          <input readOnly tabIndex={-1} value={typed} aria-label="Example answer, typed automatically" placeholder=""/>
          <span className="scene-mirror" aria-hidden="true">{typed}<i className="scene-caret"/></span>
        </div>
        <p className={`scene-meter ${view.meter ? 'on' : ''}`} aria-live="polite">
          <span className="tiers" aria-hidden="true">{STORY_TIERS.map((tier, i) => <b key={tier} style={{ ['--tier' as string]: TIER_COLOR[tier] }} className={tier === mem.tier ? 'on' : i < view.chapter ? 'past' : ''}>{tier}</b>)}</span>
        </p>
      </div>
      <div className="scene-pane scene-final" aria-hidden={!view.done}>
        <h2>Ready to <em>play?</em></h2>
        <p>Bobi made it to the bottom. Everyone holds a different piece of Daniel and Amy, so answer something only you would say.</p>
        <button className="btn btn-primary" onClick={onJoin} tabIndex={view.done ? 0 : -1} data-testid="button-story-join">Ready to play <ArrowDown size={16}/></button>
      </div>
    </div>

    <div className="scene-controls">
      {!reduced && (ended
        ? <button className="scene-icon" onClick={replay} aria-label="Replay story"><RotateCcw size={15}/></button>
        : <button className="scene-icon" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause story' : 'Play story'}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button>)}
      {!reduced && !ended && <button className="scene-icon" onClick={replay} aria-label="Restart story"><RotateCcw size={14}/></button>}
      <button className="scene-skip" onClick={onJoin} data-testid="button-story-skip">{view.done ? 'To the game' : 'Skip'} <ArrowDown size={14}/></button>
    </div>
    {!reduced && <div className="scene-progress" aria-hidden="true"><span ref={progressRef}/></div>}
    <p className="scene-rule">Rarer answers take us deeper. Example answers, not real scoring.</p>

    {reduced && <div className="scene-bobi-static"><Bobi mood="cheer"/><p className="scene-bubble is-inline">{BOBI_FINAL_LINE}</p></div>}
    {reduced && <ol className="scene-timeline" aria-label="The four memories">
      {memories.map((m, i) => <li key={m.src}><img src={m.src} alt={m.alt} loading="lazy"/><span>{String(i + 1).padStart(2, '0')} · {m.date} · example: “{m.answer}”</span><span className="scene-bubble is-inline">Bobi: “{m.comment}”</span></li>)}
    </ol>}
  </section>;
}


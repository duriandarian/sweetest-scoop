import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { memories, BOBI_INTRO_LINE, BOBI_FINAL_LINE, TIER_COLOR, storyQuestion, STORY_TIERS, TOTAL, END } from './storyData';
import { bobiDive, openingAt, openingLayout, OPENING } from './storyOpening';
import { OpeningCollage, type OpeningRefs } from './OpeningCollage';
import { bobiPose, bubblePose, cameraAt, cameraY, clamp, depthProgress, photoPos, photoReveal, smooth, uiAt, type Ui } from './storyChoreo';
import { MangoDrink, type DrinkRefs } from './MangoDrink';
import { Bobi } from './Bobi';
import { OrderTicket } from './OrderTicket';
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

const GTOTAL = OPENING + TOTAL;
/** dev-only frame seek: ?storyT=12.5 (drink time) or ?openT=4 (opening time) opens paused at that second. Stripped from production builds. */
function devSeek(): number | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const o = q.get('openT'); if (o !== null && !Number.isNaN(Number(o))) return clamp(Number(o), 0, GTOTAL);
  const v = q.get('storyT');
  return v === null || Number.isNaN(Number(v)) ? null : OPENING + clamp(Number(v), 0, TOTAL);
}
/** global clock (opening + drink) → drink story time */
const storyTime = (g: number) => clamp(g - OPENING, 0, TOTAL);

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
  const [ui, setUi] = useState<Ui>(() => uiAt(storyTime(timeRef.current)));
  const [opening, setOpening] = useState(timeRef.current < OPENING);
  const openRefs = useRef<OpeningRefs>({ root: null, photos: [], cup: null, bloom: null, bobi: null, bubble: null, title: null });
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

  const draw = useCallback((g: number) => {
    const { w, h } = sizeRef.current;
    const R = refs.current;
    if (!w || !R.cam) return;
    const t = storyTime(g);
    // ---- personal opening: collage, Bobi on the rim, dive into the cup ----
    const O = openRefs.current; const of = openingAt(g);
    if (O.root) {
      const L = openingLayout(w, h);
      O.root.style.opacity = of.fade.toFixed(3);
      O.root.style.visibility = of.done ? 'hidden' : 'visible';
      const ox = L.surface.x, oy = L.surface.y;
      for (let i = 0; i < L.photos.length; i++) {
        const el = O.photos[i]; if (!el) continue;
        const P = L.photos[i]; const k = of.photoIn[i];
        const dx = (P.x - ox) * of.spread * 1.6, dy = (P.y - oy) * of.spread * 1.6 - (1 - k) * 46;
        el.style.opacity = (k * (1 - of.spread)).toFixed(3);
        el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${(P.rot * (0.4 + 0.6 * k) + (1 - k) * 10).toFixed(2)}deg) scale(${(0.86 + 0.14 * k + of.spread * 0.5).toFixed(3)})`;
      }
      if (O.cup) { O.cup.style.opacity = (of.cupIn * of.cupFade).toFixed(3); O.cup.style.transform = `translateY(${((1 - of.cupIn) * 40).toFixed(1)}px) scale(${of.zoom.toFixed(4)})`; }
      if (O.bobi) {
        const d = bobiDive(L, of.jump); const pop = of.bobiIn;
        O.bobi.style.opacity = (pop * d.o).toFixed(3);
        O.bobi.style.transform = `translate(${d.x.toFixed(1)}px, ${(d.y + (1 - pop) * 30).toFixed(1)}px) rotate(${of.jump > 0 ? d.spin.toFixed(1) : '0'}deg) scale(${(d.s * (0.6 + 0.4 * pop)).toFixed(3)})`;
      }
      if (O.bloom) { O.bloom.style.opacity = of.bloom.toFixed(3); O.bloom.style.transform = `translate(-50%, -50%) scale(${(0.2 + 3.2 * of.bloom).toFixed(3)})`; }
      if (O.bubble) { O.bubble.classList.toggle('on', of.talk); }
      if (O.title) O.title.style.opacity = (smooth(g / 0.9) * (1 - of.spread)).toFixed(3);
    }
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
      bobiRef.current.style.opacity = smooth((g - OPENING + 0.4) / 0.8).toFixed(3);
      bobiRef.current.style.transform = `translate(${bp.x.toFixed(1)}px, ${bp.y.toFixed(1)}px)`;
      bobiRef.current.style.width = `${bp.size}px`;
      const bb = bubblePose(bp, w);
      const st = bobiRef.current.style;
      st.setProperty('--bub-l', `${bb.left.toFixed(1)}px`); st.setProperty('--bub-t', `${bb.top}px`);
      st.setProperty('--bub-w', `${bb.w}px`); st.setProperty('--bub-h', `${bb.h}px`); st.setProperty('--bub-tail', `${bb.tail.toFixed(1)}px`);
    }
    if (gaugeRef.current) gaugeRef.current.style.transform = `scaleY(${depthProgress(t).toFixed(3)})`;
    if (depthRef.current) depthRef.current.style.transform = `translateY(${(clamp(cameraY(t) / cameraY(TOTAL)) * 100).toFixed(2)}%)`;
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${clamp(g / (OPENING + END))})`;
    const next = uiAt(t);
    const key = `${next.chapter}|${next.typed}|${next.meter}|${next.done}|${next.intro}`;
    if (key !== uiKey.current) { uiKey.current = key; setUi(next); }
    setOpening(g < OPENING);
  }, []);

  useEffect(() => { cache.current = {}; draw(reduced ? GTOTAL : timeRef.current); }, [size, draw, reduced]);

  useEffect(() => {
    if (reduced || !playing) return;
    let raf = 0; let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) timeRef.current = Math.min(GTOTAL, timeRef.current + Math.min(0.05, (now - last) / 1000));
      last = now;
      draw(timeRef.current);
      if (timeRef.current >= GTOTAL) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, draw]);

  const replay = () => { timeRef.current = 0; cache.current = {}; draw(0); setPlaying(true); };
  const ended = !playing && timeRef.current >= GTOTAL;
  const view = reduced ? uiAt(TOTAL) : ui;
  const mem = memories[view.chapter];
  const line = view.done ? BOBI_FINAL_LINE : view.intro ? BOBI_INTRO_LINE : view.meter ? mem.comment : 'Ooh, what will they say?';
  const typed = view.done ? mem.answer : mem.answer.slice(0, view.typed);
  return <section className={`story-scene ${reduced ? 'is-static' : ''} ${!playing ? 'is-paused' : ''} ${opening && !reduced ? 'is-opening' : ''}`} aria-label="A scrapbook of Daniel and Amy, then Bobi the boba pearl dives into a mango sago cup and guides a drift down through a mango sago drink and four memories" aria-roledescription="autoplay preview">
    {reduced && <div className="scene-collage-static" aria-label="Daniel and Amy, a little scrapbook"><OpeningCollage w={Math.min(size.w || 390, 1100)} h={Math.max(560, Math.min(size.h || 760, 820))} staticView/></div>}
    <div className="scene-stage" ref={stageRef}>
      <div className="scene-interior">
        {size.w > 0 && <MangoDrink w={size.w} h={size.h} refs={refs}/>}
      </div>
      {size.w > 0 && !reduced && <OpeningCollage w={size.w} h={size.h} refs={openRefs}/>}
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
        <OrderTicket onClick={onJoin} tabIndex={view.done ? 0 : -1} testId="button-story-join" big/>
      </div>
    </div>

    <div className="scene-controls">
      {!reduced && (ended
        ? <button className="scene-icon" onClick={replay} aria-label="Replay story"><RotateCcw size={15}/></button>
        : <button className="scene-icon" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause story' : 'Play story'}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button>)}
      {!reduced && !ended && <button className="scene-icon" onClick={replay} aria-label="Restart story"><RotateCcw size={14}/></button>}
      {!view.done && <OrderTicket onClick={onJoin} testId="button-dive-in"/>}
    </div>
    {!reduced && <div className="scene-progress" aria-hidden="true"><span ref={progressRef}/></div>}
    <p className="scene-rule">Rarer answers take us deeper. Example answers, not real scoring.</p>

    {reduced && <div className="scene-bobi-static"><Bobi mood="cheer"/><p className="scene-bubble is-inline">{BOBI_FINAL_LINE}</p></div>}
    {reduced && <ol className="scene-timeline" aria-label="The four memories">
      {memories.map((m, i) => <li key={m.src}><img src={m.src} alt={m.alt} loading="lazy"/><span>{String(i + 1).padStart(2, '0')} · {m.date} · example: “{m.answer}”</span><span className="scene-bubble is-inline">Bobi: “{m.comment}”</span></li>)}
    </ol>}
  </section>;
}


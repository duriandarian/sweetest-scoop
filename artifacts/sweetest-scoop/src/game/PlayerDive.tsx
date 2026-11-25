import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AnswerReward } from '@workspace/api-client-react';
import { DiveScene, depthCm } from './DiveScene';
import { IngredientArt } from './IngredientArt';
import { GAME_TITLE, fmtSecs, prizeFor } from './theme';
import './player-dive.css';

function DessertMeterIcon() {
  return <svg className="pd-meter-icon" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    <path fill="#613b2d" d="M3 2h4v1h2V1h4v2h1v1h1v4h-1v4h-1v2h-2v1H5v-1H3v-2H2V8H1V4h2Z"/>
    <path fill="#ffbe40" d="M4 3h3v2H4zm6-1h3v3h-3z"/>
    <path fill="#fff1bd" d="M4 3h2v1H4zm6-1h2v1h-2zM2 5h12v2h-2v1H4V7H2z"/>
    <path fill="#f5b454" d="M3 8h1v1h8V8h1v4h-1v1h-1v1H5v-1H4v-1H3z"/>
    <path fill="#ffe3ba" d="M4 11h8v1h-1v1H5v-1H4z"/>
    <path fill="#f1a0a5" d="M7 9h2v1H7zm3 2h1v1h-1z"/>
    <path fill="#fff7e4" d="M5 11h1v1H5zm2 1h1v1H7z"/>
  </svg>;
}

/** Full-screen private dive for one guest. Starts at the surface, then sinks to the server-awarded depth. */
export function PlayerDive({ avatar, answer, reward, question, round, questionCount, total = 0, extra, children }: {
  avatar: string; answer: string; reward: AnswerReward | null | undefined;
  question?: string | null; round?: number; questionCount?: number; total?: number;
  extra?: ReactNode; children?: ReactNode;
}) {
  const target = reward ? (reward.matched ? reward.depth : -1) : null;
  const [depth, setDepth] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const stage = stageRef.current;
    if (!viewport || !stage) return;
    // Some mobile keyboards resize only the visible part of the page.
    // Keep the answer dock and feedback within the visible viewport without scaling the scene.
    const updateViewport = () => {
      const rect = stage.getBoundingClientRect();
      const bottom = viewport.scale === 1 ? Math.max(0, Math.round(rect.bottom - viewport.height - viewport.offsetTop)) : 0;
      stage.style.setProperty('--pd-dock-inset', `${bottom}px`);
    };
    updateViewport();
    viewport.addEventListener('resize', updateViewport);
    viewport.addEventListener('scroll', updateViewport);
    return () => {
      viewport.removeEventListener('resize', updateViewport);
      viewport.removeEventListener('scroll', updateViewport);
    };
  }, []);
  useEffect(() => {
    if (target == null) { setDepth(null); setLanded(false); setRevealed(false); return; }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || target < 0) { setDepth(target); setLanded(true); setRevealed(true); return; }
    setDepth(null); setLanded(false);
    let r2 = 0;
    let fallback = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => {
      setDepth(target);
      // A tab switch or interrupted CSS transition must not leave the reward hidden.
      fallback = window.setTimeout(() => { setLanded(true); setRevealed(true); }, 2100);
    }); });
    const reduceNow = () => { if (motion.matches) { setDepth(target); setLanded(true); setRevealed(true); } };
    motion.addEventListener('change', reduceNow);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); window.clearTimeout(fallback); motion.removeEventListener('change', reduceNow); };
  }, [target]);
  const prize = reward?.matched ? prizeFor(reward.tier, reward.depth) : null;
  const shownTotal = reward && !revealed ? total - (reward.points ?? 0) : total;
  const cm = landed && depth != null && depth >= 0 ? `${depthCm(depth)}` : depth != null && !landed ? '--' : '0';
  const showProgress = round !== undefined && questionCount !== undefined && round > 0 && round <= questionCount;
  // Keep the animated world out of the answer input's per-keystroke updates.
  const prompt = useMemo(() => question ? <div className="pd-prompt">
    <h1 data-testid="text-question">{question}</h1>
    <p className="pd-prompt-hint">Rarer answers sink deeper</p>
  </div> : null, [question]);
  return <section ref={stageRef} className={`pd-stage ${depth != null ? 'is-diving' : ''}`} data-testid="section-player-dive" onTransitionEnd={event => {
    if (target != null && target >= 0 && depth === target && event.propertyName === 'transform' && (event.target as HTMLElement).classList.contains('ds-world')) { setLanded(true); setRevealed(true); }
  }}>
    <div className="pd-scene" data-testid="scene-question-cup">
      <DiveScene avatar={avatar} depth={depth} compact>
        {prompt}
      </DiveScene>
    </div>
    <header className="pd-hud">
      {extra && <div className="pd-extra">{extra}</div>}
      <div className="pd-plate"><small>Depth</small><b data-testid="text-dive-depth">{cm}<i>cm</i></b></div>
      <div className="pd-game-brand">
        <span className="pd-game-title">{GAME_TITLE}</span>
        {showProgress && <div className="pd-progress">
          <div className="pd-meter">
            <DessertMeterIcon/>
            <ol className="pd-segments" aria-hidden="true">
              {Array.from({ length: questionCount }, (_, i) => <li key={i} className={i + 1 === round ? 'on' : i + 1 < round ? 'done' : ''}/>)}
            </ol>
          </div>
          <p data-testid="text-prompt-progress">Prompt {round} of {questionCount}</p>
        </div>}
      </div>
      <div className="pd-plate is-score"><small>Score</small><b data-testid="text-dive-score">{shownTotal}</b></div>
    </header>
    <div className={`pdive-card ${landed ? 'is-in' : ''}`} data-testid="card-my-dive-result" aria-live="polite">
      {reward && landed && (prize ? <div className="pdive-score" style={{ ['--pc' as string]: prize.color, ['--pi' as string]: prize.ink }}>
        <span className="pdive-tier"><IngredientArt depth={prize.depth} className="pdive-art"/>{prize.name}</span>
        <q className="pdive-answer" data-testid="text-reward-answer">{reward.canonicalAnswer ?? answer}</q>
        <strong data-testid="text-my-round-points">+{reward.points}</strong>
        <span className="pdive-math"><b>{reward.basePoints}</b> base + <b>{reward.speedBonus}</b> speed · {depthCm(reward.depth)} cm</span>
        <small>locked at {fmtSecs(reward.elapsedMs)}</small>
      </div> : <div className="pdive-score is-miss"><span className="pdive-tier"><i/>No match</span><span className="pdive-math">Not in the answer bank this round.</span><strong data-testid="text-my-round-points">0</strong></div>)}
    </div>
    <div className="pd-dock">
      {answer && <q className="pd-answer" data-testid="text-my-answer">{answer}</q>}
      {children}
    </div>
  </section>;
}

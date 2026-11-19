import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AnswerReward } from '@workspace/api-client-react';
import { DiveScene, depthCm } from './DiveScene';
import { fmtSecs, prizeFor } from './theme';
import './player-dive.css';

/** Full-screen private dive for one guest. Starts at the surface, then sinks to the server-awarded depth. */
export function PlayerDive({ avatar, answer, reward, question, round, questionCount, total = 0, extra, children }: {
  avatar: string; answer: string; reward: AnswerReward | null | undefined;
  question?: string | null; round?: number; questionCount?: number; total?: number; extra?: ReactNode; children?: ReactNode;
}) {
  const target = reward ? (reward.matched ? reward.depth : -1) : null;
  const [depth, setDepth] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (target == null) { setDepth(null); setLanded(false); return; }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || target < 0) { setDepth(target); setLanded(true); setRevealed(true); return; }
    setDepth(null); setLanded(false);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setDepth(target)); });
    const reduceNow = () => { if (motion.matches) { setDepth(target); setLanded(true); setRevealed(true); } };
    motion.addEventListener('change', reduceNow);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); motion.removeEventListener('change', reduceNow); };
  }, [target]);
  const prize = reward?.matched ? prizeFor(reward.tier, reward.depth) : null;
  const shownTotal = reward && !revealed ? total - (reward.points ?? 0) : total;
  const cm = landed && depth != null && depth >= 0 ? `${depthCm(depth)}` : depth != null && !landed ? '--' : '0';
  return <section className={`pd-stage ${depth != null ? 'is-diving' : ''}`} data-testid="section-player-dive" onTransitionEnd={event => {
    if (target != null && target >= 0 && depth === target && event.propertyName === 'transform' && (event.target as HTMLElement).classList.contains('ds-world')) { setLanded(true); setRevealed(true); }
  }}>
    <div className="pd-scene" data-testid="scene-question-cup">
      <DiveScene avatar={avatar} depth={depth} compact>
        {question && <div className="pd-prompt">
          {round != null && <p className="pd-prompt-k">Prompt {round} of {questionCount}</p>}
          <h1 data-testid="text-question">{question}</h1>
          <p className="pd-prompt-hint">Rarer answers sink deeper</p>
        </div>}
      </DiveScene>
    </div>
    <header className="pd-hud">
      {extra && <div className="pd-extra">{extra}</div>}
      <div className="pd-plate"><small>Depth</small><b data-testid="text-dive-depth">{cm}<i>cm</i></b></div>
      {questionCount ? <ol className="pd-pips" aria-label={`Prompt ${round} of ${questionCount}`}>
        {Array.from({ length: questionCount }, (_, i) => <li key={i} className={i + 1 === round ? 'on' : i + 1 < (round ?? 0) ? 'done' : ''}/>)}
      </ol> : null}
      <div className="pd-plate is-score"><small>Score</small><b data-testid="text-dive-score">{shownTotal}</b></div>
    </header>
    <div className={`pdive-card ${landed ? 'is-in' : ''}`} data-testid="card-my-dive-result" aria-live="polite">
      {reward && landed && (prize ? <div className="pdive-score" style={{ ['--pc' as string]: prize.color, ['--pi' as string]: prize.ink }}>
        <span className="pdive-tier"><i/>{prize.name}</span>
        <span className="pdive-math"><b>{reward.basePoints}</b> base + <b>{reward.speedBonus}</b> speed</span>
        <strong data-testid="text-my-round-points">+{reward.points}</strong>
        <small>locked at {fmtSecs(reward.elapsedMs)}</small>
      </div> : <div className="pdive-score is-miss"><span className="pdive-tier"><i/>No match</span><span className="pdive-math">Not in the answer bank this round.</span><strong data-testid="text-my-round-points">0</strong></div>)}
    </div>
    <div className="pd-dock">
      {answer && <q className="pd-answer" data-testid="text-my-answer">{answer}</q>}
      {children}
    </div>
  </section>;
}

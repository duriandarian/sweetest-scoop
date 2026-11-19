import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Menu, MonitorPlay, RotateCcw, Smartphone } from 'lucide-react';
import { Link } from 'wouter';
import { Answering } from './Round';
import { PRIZES } from './theme';
import { DEFAULT_LOOK, encodeAvatar } from './wardrobe';
import { PREVIEW_QUESTIONS, questionPreviewState } from './question-preview-state';
import { countdownSeconds, PRACTICE_ROUND_MS, remainingPracticeMs } from './round-countdown';
import './question-preview.css';
import { useMusicScene } from './MusicProvider';
import { MusicStatus } from './MusicStatus';

/** Reuses the real question components without creating rooms or saving fake submissions. */
export function QuestionPreview({ practice: solo = false }: { practice?: boolean }) {
  const [host, setHost] = useState(() => !solo && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('screen') === 'host');
  // The phone preview is playable practice too, not a second silent/paused mode.
  const practice = solo || !host;
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [tier, setTier] = useState(2);
  const [run, setRun] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const [lockedAtMs, setLockedAtMs] = useState(0);
  useEffect(() => {
    if (!practice || deadline === null) return;
    const timer = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (timestamp >= deadline) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [practice, deadline]);
  const remainingMs = practice ? remainingPracticeMs(deadline, now) : PRACTICE_ROUND_MS;
  const seconds = countdownSeconds(remainingMs)!;
  useMusicScene(practice ? remainingMs > 0 ? 'round' : 'cafe' : host ? 'round' : 'silent',
    practice && deadline !== null && remainingMs > 0 && remainingMs <= 10000);
  const avatar = encodeAvatar(DEFAULT_LOOK);
  const reset = () => {
    setAnswer(null); setRun(n => n + 1); setLockedAtMs(0);
    setNow(Date.now()); setDeadline(null);
  };
  const startPractice = () => {
    const start = Date.now();
    if (!practice || (deadline !== null && start < deadline)) return;
    setNow(start); setDeadline(start + PRACTICE_ROUND_MS);
  };
  const changeQuestion = (next: number) => { setIndex(next); reset(); };
  const room = questionPreviewState({ index, host, answer, tier, avatar });
  if (practice && room.myReward) room.myReward = { ...room.myReward, elapsedMs: lockedAtMs };
  const submit = (text: string) => {
    const timestamp = Date.now();
    if (practice && deadline !== null && timestamp >= deadline) { setNow(timestamp); return; }
    setLockedAtMs(practice && deadline !== null ? Math.max(0, PRACTICE_ROUND_MS - (deadline - timestamp)) : 0);
    setAnswer(text);
  };
  const scene = <Answering key={`${host}-${index}-${run}`} room={room} avatar={avatar} remainingMs={remainingMs} onSubmit={submit} submitting={false} error="" practice={practice}
    practiceWaiting={practice && deadline === null} onDraftChange={startPractice}
    roundActions={practice && (answer !== null || remainingMs <= 0) ? <div className="qp-round-actions">
      <button type="button" onClick={reset} data-testid="button-practice-retry"><RotateCcw size={14}/> Try again</button>
      <button type="button" onClick={() => changeQuestion((index + 1) % PREVIEW_QUESTIONS.length)} data-testid="button-practice-next">Next question <ArrowRight size={14}/></button>
    </div> : undefined}
    hud={host ? undefined : <>
    <details className="qp-menu">
      <summary aria-label={practice ? 'Practice options' : 'Preview controls'} data-testid="button-preview-options"><Menu size={16}/></summary>
      <div className="qp-menu-body">
        <p className="g-kicker">{practice ? 'Practice round' : 'Question preview'}</p>
        {practice && <MusicStatus/>}
        {!solo && <div className="seg" role="group" aria-label="Screen to preview">
          <button type="button" className="on" aria-pressed="true" onClick={() => setHost(false)} data-testid="button-preview-phone"><Smartphone size={14}/> Phone</button>
          <button type="button" aria-pressed="false" onClick={() => { reset(); setHost(true); }} data-testid="button-preview-host"><MonitorPlay size={14}/> Host</button>
        </div>}
        {practice && <button type="button" className="qp-menu-btn" onClick={reset} data-testid="button-solo-reset"><RotateCcw size={13}/> Restart round</button>}
        <button type="button" className="qp-menu-btn" onClick={() => changeQuestion((index + 1) % PREVIEW_QUESTIONS.length)} data-testid="button-preview-next">Next prompt <ArrowRight size={14}/></button>
        <label>Question<select value={index} onChange={e => changeQuestion(Number(e.target.value))} data-testid="select-preview-question">
          {PREVIEW_QUESTIONS.map((_, i) => <option key={i} value={i}>Question {i + 1}</option>)}
        </select></label>
        <label>Example dive depth<select value={tier} onChange={e => { setTier(Number(e.target.value)); reset(); }} data-testid="select-preview-reward">
          {PRIZES.map((p, i) => <option key={p.name} value={i}>{i === 0 ? 'Shallowest' : i === PRIZES.length - 1 ? 'Deepest' : `Depth ${i + 1} of ${PRIZES.length}`}</option>)}
        </select></label>
        <button type="button" className="qp-menu-btn" onClick={reset} data-testid="button-preview-reset"><RotateCcw size={13}/> Reset answer</button>
        <p>{practice ? `${PRACTICE_ROUND_MS / 1000} seconds, starting when you type. ` : 'Timer paused. '}Your answer is not checked; the dive uses the example depth. Nothing is saved.</p>
        <Link href="/" className="qp-menu-btn" data-testid="link-preview-menu"><ArrowLeft size={13}/> Back to menu</Link>
      </div>
    </details>
    <span className="qp-badge" role="note">{practice ? 'Practice · unscored' : 'Preview · paused'}</span>
  </>}/>;
  if (!host) return <div className={`g-screen question-preview is-game ${practice ? 'is-practice' : ''}`}>{scene}</div>;
  return <div className="g-screen question-preview">
    <header className="g-bar">
      <div className="g-left"><span className="g-brand">Daniel <i>+</i> Amy</span></div>
      <span className="g-timer">{seconds}s</span>
      <Link href="/" className="g-link" data-testid="link-preview-menu"><ArrowLeft size={13}/> Menu</Link>
    </header>
    <nav className="qp-toolbar" aria-label="Question preview">
      <div className="seg" role="group" aria-label="Screen to preview">
        <button type="button" aria-pressed="false" onClick={() => { reset(); setHost(false); }} data-testid="button-preview-phone"><Smartphone size={14}/> Phone practice</button>
        <button type="button" className="on" aria-pressed="true" onClick={() => setHost(true)} data-testid="button-preview-host"><MonitorPlay size={14}/> Host screen</button>
      </div>
      <button type="button" className="g-link" onClick={() => changeQuestion((index + 1) % PREVIEW_QUESTIONS.length)} data-testid="button-preview-next">Next prompt <ArrowRight size={14}/></button>
    </nav>
    <p className="qp-note" role="note"><b>Question preview</b> · Timer paused. No room, answers, or points are saved.</p>
    <main className="g-main">{scene}</main>
  </div>;
}

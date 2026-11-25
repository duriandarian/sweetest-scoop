import { useEffect, useRef, useState } from 'react';
import type { AnswerCorrection } from '@workspace/api-client-react';
import type { FormEvent, ReactNode } from 'react';
import { CircleX, Lock, Send } from 'lucide-react';
import { BobiAvatar } from './BobiAvatar';
import { HostRound } from './HostRound';
import { PlayerDive } from './PlayerDive';
import { AnswerCountdown } from './AnswerCountdown';
import { Catalog, Podium, RoundBoard, TotalBoard, NextHint } from './Results';
import { HonorableMentions } from './HonorableMentions';
import { fmtSecs, prizeFor, type Room } from './theme';
import './host-round.css';

export function Answering({ room, avatar, remainingMs, onSubmit, submitting, error, feedback = '', correction = null, practice = false, practiceWaiting = false, onDraftChange, roundActions, hud }: { room: Room; avatar: string; remainingMs: number | null; onSubmit: (a: string) => void; submitting: boolean; error: string; feedback?: string; correction?: AnswerCorrection | null; practice?: boolean; practiceWaiting?: boolean; onDraftChange?: () => void; roundActions?: ReactNode; hud?: ReactNode }) {
  const [text, setText] = useState('');
  const composing = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const expired = remainingMs != null && remainingMs <= 0;
  const locked = !!room.myAnswer;
  const retry = !locked && !expired && !submitting && !error && !correction && !!feedback;
  useEffect(() => {
    if (!correction || locked) return;
    setText(correction.correctedAnswer);
    input.current?.focus({ preventScroll: true });
  }, [correction, locked]);
  useEffect(() => {
    if (!submitting && !locked && !expired && (feedback || error)) input.current?.focus({ preventScroll: true });
  }, [submitting, locked, expired, feedback, error]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || locked || expired || submitting || practiceWaiting || composing.current) return;
    // Keep the keyboard available on touch devices while the answer is checked.
    input.current?.focus({ preventScroll: true });
    onSubmit(text.trim());
  };
  if (room.isHost) return <>{error && <p className="g-error" role="alert">{error}</p>}<HostRound room={room} remainingMs={remainingMs}/></>;
  return <PlayerDive avatar={avatar} answer={room.myAnswer ?? ''} reward={locked ? room.myReward : null}
    question={room.currentQuestion} round={room.round} questionCount={room.questionCount} total={room.myTotalPoints ?? 0} extra={hud}>
    {!locked && correction && <div className="pd-correction" id="answer-correction-hint" role="status" data-testid="status-answer-correction">
      <p><s>“{correction.originalAnswer}”</s><span aria-hidden="true"> → </span><strong>“{correction.correctedAnswer}”</strong></p>
      <small>{expired ? 'Time is up. This correction was not submitted.' : 'Submit again to confirm · or edit your answer'}</small>
    </div>}
    {!locked && <div className="pd-entry">
      {error && <p className="g-error" role="alert" id="answer-connection-hint" data-testid="status-answer-connection">{error}</p>}
      <div className="pd-retry-status" id="answer-retry-hint" role="status" aria-atomic="true">
        {retry && <p className="g-feedback-coral pd-retry-banner" data-testid="status-answer-feedback">
          <CircleX size={21} aria-hidden="true"/>
          <span><strong>Not on the menu.</strong> Try another answer.</span>
        </p>}
      </div>
      <form className="dock-form pd-form" onSubmit={submit}>
        <AnswerCountdown remainingMs={remainingMs}/>
        <input ref={input} autoFocus aria-label="Your one answer" aria-describedby={error ? 'answer-connection-hint' : correction ? 'answer-correction-hint' : retry ? 'answer-retry-hint' : undefined} data-testid="input-answer" maxLength={120} disabled={!practice && expired} readOnly={submitting || expired} aria-busy={submitting} placeholder={expired ? 'Time is up' : 'Your one answer...'} value={text}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.nativeEvent.isComposing || composing.current)) e.preventDefault(); }}
          onChange={e => { setText(e.target.value); onDraftChange?.(); }}/>
        <button className="pd-go" disabled={!text.trim() || expired || submitting || practiceWaiting} data-testid="button-submit-answer">{submitting ? 'Checking...' : correction ? 'Confirm' : 'Dive'} <Send size={15}/></button>
      </form>
    </div>}
    {!locked && practice && <p className="pd-note" role="status">{expired ? "Time's up. Try again or choose the next question." : practiceWaiting ? 'Get ready. Your 25 seconds start in a moment.' : 'One answer. Dive before the timer runs out.'}</p>}
    {!locked && expired && !practice && <p className="pd-note" role="status">Time's up. This answer is closed.</p>}
    {locked && <div className="pd-locked" data-testid="status-answer-locked">
      <span className="ph-seal"><Lock size={12}/>Locked</span>
      <p>{practice ? 'Practice points only. Not saved to a room.' : expired ? 'Time. The big screen is pouring the podium.' : 'Only you see this dive. Watch the big screen.'}</p>
      <AnswerCountdown remainingMs={remainingMs}/>
    </div>}
    {roundActions}
  </PlayerDive>;
}

function MyResult({ room, avatar }: { room: Room; avatar: string }) {
  const reward = room.myReward;
  const prize = reward?.matched ? prizeFor(reward.tier, reward.depth) : null;
  return <div className="g-card res-mine is-hl" data-testid="card-my-reward">
    <BobiAvatar avatar={avatar} size={56}/>
    <div><p className="g-kicker">Your scoop</p>
      {room.myAnswer ? <><h3>"{room.myAnswer}"</h3>
        <p>{prize && reward ? <><b>{prize.name}</b> · {reward.basePoints} base + {reward.speedBonus} speed = <b>{reward.points}</b> · {fmtSecs(reward.elapsedMs)}</> : reward ? 'Not in the bank. 0 points.' : 'Scoring...'}</p></>
        : <h3>No answer this round.</h3>}
    </div>
  </div>;
}

export function Revealed({ room, avatar, onNext, nexting }: { room: Room; avatar: string; onNext: () => void; nexting: boolean }) {
  const last = room.round >= room.questionCount;
  return <div className={`reveal g-arrive ${room.isHost ? 'is-host-results' : ''}`}>
    <header className="reveal-head"><p className="g-kicker">Round {room.round} results</p><h1>{room.currentQuestion}</h1></header>
    {!room.isHost && <MyResult room={room} avatar={avatar}/>}
    <div className="reveal-stage">
      <div className="reveal-col">
        <div className="g-card res-podium"><Podium standings={room.standings} title="Overall top five · total points" testId="podium-round"/></div>
        {room.isHost ? <><button className="g-btn g-btn-primary wide" onClick={onNext} disabled={nexting} data-testid="button-next-round">{nexting ? 'One moment...' : last ? 'Final standings' : 'Next question'}</button><NextHint last={last}/></>
          : <p className="dock-note">The host moves us to the {last ? 'final podium' : 'next question'}.</p>}
      </div>
      <div className="g-card"><Catalog key={room.round} answers={room.possibleAnswers ?? []} mine={room.isHost ? null : room.myAnswer}/></div>
    </div>
    <div className="reveal-grid">
      <div className="reveal-col"><div className="g-card"><p className="g-kicker">Every guest this round</p><RoundBoard standings={room.roundStandings ?? []}/></div></div>
      <div className="reveal-col"><div className="g-card"><p className="g-kicker">Running total</p><TotalBoard standings={room.standings}/></div></div>
    </div>
  </div>;
}

export function Finished({ room, share }: { room: Room; share?: ReactNode }) {
  const mentions = room.honorableMentions ?? [];
  return <div className={`reveal is-final g-arrive ${room.isHost ? 'is-host-results' : ''}${mentions.length ? ' has-mentions' : ''}`}>
    <div className="g-card res-podium"><Podium standings={room.standings} title="Final podium" testId="podium-final"/></div>
    {mentions.length > 0 && <HonorableMentions mentions={mentions}/>}
    {share}
  </div>;
}

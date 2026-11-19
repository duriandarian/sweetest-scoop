import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Lock, Send } from 'lucide-react';
import { BobiAvatar } from './BobiAvatar';
import { HostRound } from './HostRound';
import { PlayerDive } from './PlayerDive';
import { AnswerCountdown } from './AnswerCountdown';
import { Catalog, Podium, RoundBoard, TotalBoard, NextHint } from './Results';
import { fmtSecs, prizeFor, type Room } from './theme';
import './host-round.css';

export function Answering({ room, avatar, remainingMs, onSubmit, submitting, error, practice = false, practiceWaiting = false, onDraftChange, roundActions, hud }: { room: Room; avatar: string; remainingMs: number | null; onSubmit: (a: string) => void; submitting: boolean; error: string; practice?: boolean; practiceWaiting?: boolean; onDraftChange?: () => void; roundActions?: ReactNode; hud?: ReactNode }) {
  const [text, setText] = useState('');
  const expired = remainingMs != null && remainingMs <= 0;
  const locked = !!room.myAnswer;
  const submit = (e: FormEvent) => { e.preventDefault(); if (text.trim() && !locked && !expired) onSubmit(text.trim()); };
  if (room.isHost) return <>{error && <p className="g-error" role="alert">{error}</p>}<HostRound room={room} remainingMs={remainingMs}/></>;
  return <PlayerDive avatar={avatar} answer={room.myAnswer ?? ''} reward={locked ? room.myReward : null}
    question={room.currentQuestion} round={room.round} questionCount={room.questionCount} total={room.myTotalPoints ?? 0} extra={hud}>
    {!locked && <form className="dock-form pd-form" onSubmit={submit}>
      <AnswerCountdown remainingMs={remainingMs}/>
      <input autoFocus aria-label="Your one answer" data-testid="input-answer" maxLength={120} disabled={(!practice && expired) || submitting} placeholder={expired && !practice ? 'Time is up' : 'Your one answer...'} value={text} onChange={e => { setText(e.target.value); if (e.target.value.trim()) onDraftChange?.(); }}/>
      <button className="pd-go" disabled={!text.trim() || expired || submitting} data-testid="button-submit-answer">{submitting ? 'Sinking...' : 'Dive'} <Send size={15}/></button>
    </form>}
    {!locked && practice && <p className="pd-note" role="status">{expired ? "Time's up. Keep typing to start a fresh 25 seconds, or try the next question." : practiceWaiting ? 'Your 25 seconds start when you type.' : 'One answer. Dive before the timer runs out.'}</p>}
    {!locked && expired && !practice && <p className="pd-note" role="status">Time's up. This answer is closed.</p>}
    {locked && <div className="pd-locked" data-testid="status-answer-locked">
      <span className="ph-seal"><Lock size={12}/>Locked</span>
      <p>{practice ? 'Practice dive. Not scored.' : expired ? 'Time. The big screen is pouring the podium.' : 'Only you see this dive. Watch the big screen.'}</p>
      <AnswerCountdown remainingMs={remainingMs}/>
    </div>}
    {error && <p className="g-error" role="alert">{error}</p>}
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
        <div className="g-card res-podium"><Podium standings={room.roundStandings ?? []} title="This round's top three" testId="podium-round"/></div>
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

export function Finished({ room }: { room: Room }) {
  return <div className={`reveal g-arrive ${room.isHost ? 'is-host-results' : ''}`}>
    <header className="reveal-head"><p className="g-kicker">The last spoonful</p><h1>Who knows Daniel and Amy best.</h1></header>
    <div className="reveal-stage">
      <div className="g-card res-podium"><Podium standings={room.standings} title="Final podium" testId="podium-final"/></div>
      {(room.possibleAnswers?.length ?? 0) > 0 && <div className="g-card"><p className="g-kicker">Last question · {room.currentQuestion}</p><Catalog key={`final-${room.round}`} answers={room.possibleAnswers ?? []} mine={room.isHost ? null : room.myAnswer}/></div>}
    </div>
    <div className="g-card"><p className="g-kicker">Everyone at the table</p><TotalBoard standings={room.standings}/></div>
  </div>;
}

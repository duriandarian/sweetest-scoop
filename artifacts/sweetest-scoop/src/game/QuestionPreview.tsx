import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Menu, MonitorPlay, RotateCcw, Smartphone } from 'lucide-react';
import { Link } from 'wouter';
import { Answering } from './Round';
import { checkPracticeAnswer, useCheckPracticeAnswer, type AnswerCorrection, type AnswerReward } from '@workspace/api-client-react';
import { DEFAULT_LOOK, encodeAvatar } from './wardrobe';
import { CROWD_PREVIEW_GUESTS, CROWD_PREVIEW_START, PREVIEW_QUESTIONS, crowdPreviewState, questionPreviewState } from './question-preview-state';
import { PRACTICE_PROMPT_DELAY_MS, PRACTICE_ROUND_MS, remainingPracticeMs } from './round-countdown';
import './question-preview.css';
import { useMusicScene } from './MusicProvider';
import { MusicStatus } from './MusicStatus';
import { GAME_TITLE } from './theme';
import { withRequestDeadline } from './request-deadline';

/** Reuses the real question components without creating rooms or saving fake submissions. */
export function QuestionPreview({ practice: solo = false }: { practice?: boolean }) {
  const [host, setHost] = useState(() => !solo && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('screen') === 'host');
  const [crowd] = useState(() => !solo && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('guests') === '40');
  const [sampleCount, setSampleCount] = useState(CROWD_PREVIEW_START);
  // The phone preview is playable practice too, not a second silent/paused mode.
  const practice = solo || !host;
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [reward, setReward] = useState<AnswerReward | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [correction, setCorrection] = useState<AnswerCorrection | null>(null);
  const checkAnswer = useCheckPracticeAnswer({ mutation: { networkMode: 'always', retry: false,
    mutationFn: ({ data }) => withRequestDeadline(signal => checkPracticeAnswer(data, { signal })),
  } });
  const attempt = useRef(0);
  const [run, setRun] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => () => { attempt.current++; }, []);
  useEffect(() => {
    if (!practice) { setDeadline(null); return; }
    const timestamp = Date.now();
    setNow(timestamp);
    setDeadline(timestamp + PRACTICE_PROMPT_DELAY_MS + PRACTICE_ROUND_MS);
  }, [practice, index, run]);
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
  const practiceWaiting = practice && (deadline === null || now < deadline - PRACTICE_ROUND_MS);
  useMusicScene(practice ? remainingMs > 0 ? 'round' : 'cafe' : host ? 'round' : 'silent',
    practice && deadline !== null && remainingMs > 0 && remainingMs <= 10000);
  const avatar = encodeAvatar(DEFAULT_LOOK);
  const reset = () => {
    attempt.current++; checkAnswer.reset();
    setAnswer(null); setReward(null); setError(''); setFeedback(''); setCorrection(null); setRun(n => n + 1);
    setSampleCount(CROWD_PREVIEW_START);
    setNow(Date.now()); setDeadline(null);
  };
  const clearFeedback = () => {
    setError('');
    setFeedback('');
    setCorrection(null);
  };
  const changeQuestion = (next: number) => { setIndex(next); reset(); };
  const preview = questionPreviewState({ index, host, answer, reward, avatar });
  const room = host && crowd ? crowdPreviewState(preview, sampleCount) : preview;
  const submit = (text: string) => {
    const timestamp = Date.now();
    if (checkAnswer.isPending || (practice && (deadline === null || timestamp < deadline - PRACTICE_ROUND_MS))) return;
    if (practice && deadline !== null && timestamp >= deadline) { setNow(timestamp); return; }
    const request = ++attempt.current;
    setError(''); setFeedback('');
    checkAnswer.mutate({ data: {
      answer: text, round: index + 1,
      elapsedMs: deadline === null ? 0 : Math.max(0, PRACTICE_ROUND_MS - (deadline - timestamp)),
    } }, {
      onSuccess: checked => {
        if (request !== attempt.current) return;
        if (checked.answerCorrection) {
          setCorrection(checked.answerCorrection);
          return;
        }
        if (!checked.matched) {
          setFeedback("Not on this question's menu. Try another answer.");
          return;
        }
        setCorrection(null); setReward(checked); setAnswer(checked.canonicalAnswer ?? text);
      },
      onError: () => {
        if (request === attempt.current) setError('Could not check your answer. Please try again.');
      },
    });
  };
  const scene = <Answering key={`${host}-${index}-${run}`} room={room} avatar={avatar} remainingMs={remainingMs} onSubmit={submit} submitting={checkAnswer.isPending} error={error} feedback={feedback} correction={correction} practice={practice}
    practiceWaiting={practiceWaiting} onDraftChange={clearFeedback}
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
        <Link href="/preview/results" className="qp-menu-btn" data-testid="link-host-results-preview"><MonitorPlay size={14}/> Host results preview</Link>
        {!solo && <div className="seg" role="group" aria-label="Screen to preview">
          <button type="button" className="on" aria-pressed="true" onClick={() => setHost(false)} data-testid="button-preview-phone"><Smartphone size={14}/> Phone</button>
          <button type="button" aria-pressed="false" onClick={() => { reset(); setHost(true); }} data-testid="button-preview-host"><MonitorPlay size={14}/> Host</button>
        </div>}
        {practice && <button type="button" className="qp-menu-btn" onClick={reset} data-testid="button-solo-reset"><RotateCcw size={13}/> Restart round</button>}
        <button type="button" className="qp-menu-btn" onClick={() => changeQuestion((index + 1) % PREVIEW_QUESTIONS.length)} data-testid="button-preview-next">Next prompt <ArrowRight size={14}/></button>
        <label>Question<select value={index} onChange={e => changeQuestion(Number(e.target.value))} data-testid="select-preview-question">
          {PREVIEW_QUESTIONS.map((_, i) => <option key={i} value={i}>Question {i + 1}</option>)}
        </select></label>
        <button type="button" className="qp-menu-btn" onClick={reset} data-testid="button-preview-reset"><RotateCcw size={13}/> Reset answer</button>
        <p>The 25-second countdown starts automatically after a one-second pause. Answers are checked against this question's real list. Only a valid answer earns a dive. Practice points are not saved to a room.</p>
        <Link href="/" className="qp-menu-btn" data-testid="link-preview-menu"><ArrowLeft size={13}/> Back to menu</Link>
      </div>
    </details>
    <span className="qp-badge" role="note">{practice ? 'Practice · not saved' : 'Preview · paused'}</span>
  </>}/>;
  if (!host) return <div className={`g-screen question-preview is-game ${practice ? 'is-practice' : ''}`}>{scene}</div>;
  return <div className="g-screen question-preview">
    <header className="g-bar">
      <div className="g-left"><span className="g-brand">{GAME_TITLE}</span></div>
      <Link href="/" className="g-link" data-testid="link-preview-menu"><ArrowLeft size={13}/> Menu</Link>
    </header>
    <nav className="qp-toolbar" aria-label="Question preview">
      <div className="seg" role="group" aria-label="Screen to preview">
        <button type="button" aria-pressed="false" onClick={() => { reset(); setHost(false); }} data-testid="button-preview-phone"><Smartphone size={14}/> Phone practice</button>
        <button type="button" className="on" aria-pressed="true" onClick={() => setHost(true)} data-testid="button-preview-host"><MonitorPlay size={14}/> Host screen</button>
      </div>
      <div className="qp-host-preview-actions">
        {crowd && <button type="button" className="qp-demo-drop" data-testid="button-drop-sample-bobi" onClick={() => {
          if (sampleCount >= CROWD_PREVIEW_GUESTS) {
            setSampleCount(CROWD_PREVIEW_START);
            setRun(n => n + 1);
          } else {
            setSampleCount(n => Math.min(n + 1, CROWD_PREVIEW_GUESTS));
          }
        }}>{sampleCount >= CROWD_PREVIEW_GUESTS ? 'Reset sample cup' : 'Drop a sample Bobi'}</button>}
        <button type="button" className="g-link" onClick={() => changeQuestion((index + 1) % PREVIEW_QUESTIONS.length)} data-testid="button-preview-next">Next prompt <ArrowRight size={14}/></button>
      </div>
    </nav>
    <p className="qp-note" role="note"><b>Question preview</b> · Timer paused. No room, answers, or points are saved.{crowd && ' 40 sample Bobis, not real players.'}</p>
    <main className="g-main">{scene}</main>
  </div>;
}

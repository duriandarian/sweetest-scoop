import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  getGetRoomQueryKey,
  useCreateRoom,
  useGetRoom,
  useJoinRoom,
  useNextQuestion,
  useRevealAnswers,
  useStartGame,
  useSubmitAnswer,
  useUpdateQuestions,
} from '@workspace/api-client-react';
import type { GroupedAnswer, RoomState, Standing } from '@workspace/api-client-react';
import { ArrowRight, Check, Copy, Crown, DoorOpen, RotateCcw, Send, Users, Volume2, VolumeX } from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ExcavationScene } from './components/ExcavationScene';
import { IngredientBadge } from './components/IngredientBadge';
import { StoryIntro } from './components/story/StoryIntro';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const ingredients = [
  { name: 'Snow cap', icon: 'snow', tier: 'Top layer' },
  { name: 'Strawberry', icon: 'berry', tier: 'Top layer' },
  { name: 'Mango', icon: 'mango', tier: 'Top layer' },
  { name: 'Taro cream', icon: 'taro', tier: 'Sweet layer' },
  { name: 'Red bean', icon: 'beans', tier: 'Sweet layer' },
  { name: 'Mochi', icon: 'mochi', tier: 'Chewy layer' },
  { name: 'Grass jelly', icon: 'jelly', tier: 'Chewy layer' },
  { name: 'Lychee', icon: 'lychee', tier: 'Deep layer' },
  { name: 'Egg pudding', icon: 'pudding', tier: 'Deep layer' },
  { name: 'Brown sugar boba', icon: 'boba', tier: 'Heart of the bowl' },
];

function Logo() {
  return <Link href="/" className="brand" data-testid="link-home">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M7 19c1-8 5-12 10-12 5 0 8 5 8 12-4-2-7-2-10 0-3 2-5 2-8 0Z" fill="#fff8e9" stroke="#684c41" strokeWidth="1.7"/><path d="M8 20c3 3 6 4 9 4s6-1 9-4" stroke="#684c41" strokeWidth="2" strokeLinecap="round"/><path d="M13 12c1 1 1 2 0 3m6-5c-1 1-1 2 0 3" stroke="#d77b89" strokeWidth="2" strokeLinecap="round"/></svg></span>
    <span><span className="brand-name">The Sweetest Scoop</span><span className="brand-note">a love story, under the ice</span></span>
  </Link>;
}

function BrandShell({ children }: { children: ReactNode }) {
  return <main className="app-shell"><div className="page-wrap">
    <header className="masthead"><Logo/><span className="top-note">Daniel + Amy · Meet Fresh</span></header>
    {children}
    <footer className="footer-note">A tiny celebration of the people who know them best.</footer>
  </div></main>;
}

function Home() {
  const [, setLocation] = useLocation();
  const [hostName, setHostName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    createRoom.mutate({ data: { hostName: hostName.trim() } }, {
      onSuccess: (session) => {
        localStorage.setItem(`sweetest-scoop:${session.room.code}`, session.sessionToken);
        setLocation(`/room/${session.room.code}`);
      },
      onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not open a room. Please try again.'),
    });
  };
  const onJoin = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const code = roomCode.trim().toUpperCase();
    joinRoom.mutate({ code, data: { displayName: guestName.trim() } }, {
      onSuccess: (session) => {
        localStorage.setItem(`sweetest-scoop:${session.room.code}`, session.sessionToken);
        setLocation(`/room/${session.room.code}`);
      },
      onError: (cause) => setError(cause instanceof Error ? cause.message : 'That room could not be found. Check the code and try again.'),
    });
  };
  return <>
    <StoryIntro onJoin={() => document.getElementById('join-game')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}/>
    <BrandShell>
    <div className="home-intro arrive" id="join-game">
      <div><span className="eyebrow">a party game for two very sweet people</span><h1 className="form-title" style={{fontSize:'clamp(26px,3.4vw,34px)',marginTop:8}}>Pull up a chair.</h1></div>
      <Link href="/solo" className="btn btn-soft" data-testid="link-solo">Try a solo scoop <ArrowRight size={16}/></Link>
    </div>
    <section className="home-forms" aria-label="Create or join a game">
      <form className="panel form-card" onSubmit={onCreate}>
        <p className="section-kicker">Gather the room</p><h2 className="form-title">Host a new game</h2><p className="form-subtitle">Start the bowl, invite everyone in.</p>
        <label className="field-label" htmlFor="host-name">Your name</label>
        <div className="answer-input-row"><input id="host-name" className="text-input" data-testid="input-host-name" maxLength={32} required placeholder="e.g. Daniel" value={hostName} onChange={e => setHostName(e.target.value)}/><button className="btn btn-primary" data-testid="button-create-room" disabled={createRoom.isPending}>{createRoom.isPending ? 'Opening…' : 'Create room'} <ArrowRight size={16}/></button></div>
      </form>
      <form className="panel form-card" onSubmit={onJoin}>
        <p className="section-kicker">Already invited?</p><h2 className="form-title">Join the table</h2><p className="form-subtitle">No account, just a name and a room code.</p>
        <div className="form-field"><label className="field-label" htmlFor="room-code">Room code</label><input id="room-code" className="text-input" data-testid="input-room-code" maxLength={12} required placeholder="SWEET7" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}/></div>
        <div className="answer-input-row"><input className="text-input" aria-label="Your name" data-testid="input-guest-name" maxLength={32} required placeholder="Your name" value={guestName} onChange={e => setGuestName(e.target.value)}/><button className="btn btn-soft" data-testid="button-join-room" disabled={joinRoom.isPending}>{joinRoom.isPending ? 'Joining…' : 'Join room'} <DoorOpen size={16}/></button></div>
      </form>
    </section>
    {error && <div className="error-box" role="alert" data-testid="status-home-error">{error}</div>}
    </BrandShell>
  </>;
}

function RoomPage() {
  const { code: routeCode = '' } = useParams<{ code: string }>();
  const code = routeCode.toUpperCase();
  const [token, setToken] = useState(() => localStorage.getItem(`sweetest-scoop:${code}`) ?? '');
  const queryClient = useQueryClient();
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const request = useMemo(() => ({ headers: { 'X-Session-Token': token } }), [token]);
  const roomQuery = useGetRoom(code, { request, query: { queryKey: getGetRoomQueryKey(code), enabled: !!token, refetchInterval: 1800, retry: 2 } });
  const room = roomQuery.data as RoomState | undefined;
  const joinRoom = useJoinRoom();
  const updateQuestions = useUpdateQuestions({ request });
  const startGame = useStartGame({ request });
  const submitAnswer = useSubmitAnswer({ request });
  const revealAnswers = useRevealAnswers({ request });
  const nextQuestion = useNextQuestion({ request });
  useEffect(() => { if (room?.questions?.length === 10) setQuestions(room.questions); }, [room?.code, room?.questions?.join('|')]);
  useEffect(() => {
    if (!roomQuery.error) return;
    setError('We couldn’t reach this room. Check your connection or rejoin with the room code.');
  }, [roomQuery.error]);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  };
  const doJoin = (event: FormEvent) => {
    event.preventDefault();
    joinRoom.mutate({ code, data: { displayName: joinName.trim() } }, {
      onSuccess: session => {
        localStorage.setItem(`sweetest-scoop:${code}`, session.sessionToken);
        setToken(session.sessionToken);
        void queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(code) });
      },
      onError: cause => setJoinError(cause instanceof Error ? cause.message : 'Could not join this room.'),
    });
  };
  const commit = (promise: { mutate: (variables: never, options?: object) => void }, variables: unknown) => {
    setError('');
    (promise.mutate as (v: unknown, o: { onError: (e: unknown) => void }) => void)(variables, { onError: e => setError(e instanceof Error ? e.message : 'That action did not go through. Please try again.') });
  };
  if (roomQuery.isLoading) return <BrandShell><LoadingRoom/></BrandShell>;
  if (!room) return <BrandShell>
    <section className="panel form-card arrive"><p className="section-kicker">Room {code}</p><h1 className="form-title">Come take a seat</h1><p className="form-subtitle">Add your name to join the table. No account needed.</p>
      <form onSubmit={doJoin} className="answer-input-row"><input className="text-input" data-testid="input-room-join-name" required maxLength={32} placeholder="Your name" value={joinName} onChange={e => setJoinName(e.target.value)}/><button className="btn btn-primary" data-testid="button-room-join" disabled={joinRoom.isPending}>{joinRoom.isPending ? 'Joining…' : 'Join room'} <ArrowRight size={16}/></button></form>
      {joinError && <div className="error-box" role="alert">{joinError}</div>}
      {error && <div className="error-box" role="alert">{error}</div>}
      <Link href="/" className="btn btn-soft" style={{marginTop:14}} data-testid="link-back-home">Back to the beginning</Link>
    </section>
  </BrandShell>;

  return <BrandShell>
    <div className="page-heading arrive">
      <div><span className="eyebrow">the table is set</span><h1>{room.phase === 'lobby' ? 'The waiting bowl' : room.phase === 'finished' ? 'The sweetest finish' : 'Let’s dig in'}</h1></div>
      <div className="room-code" data-testid="text-room-code"><span>ROOM</span><strong>{room.code}</strong><button aria-label="Copy room code" data-testid="button-copy-room" onClick={copyCode} style={{border:0,background:'transparent',color:'inherit',padding:2}}>{copied ? <Check size={16}/> : <Copy size={16}/>}</button></div>
    </div>
    {error && <div className="error-box" role="alert" data-testid="status-room-error">{error} <button className="btn btn-soft" onClick={() => void roomQuery.refetch()} style={{marginLeft:8,padding:'5px 10px',minHeight:32}}>Retry</button></div>}
    {room.phase === 'lobby' && <Lobby room={room} questions={questions} setQuestions={setQuestions} onSave={() => commit(updateQuestions as never, { code, data: { questions } })} onStart={() => commit(startGame as never, { code })} saving={updateQuestions.isPending} starting={startGame.isPending}/>}
    {room.phase === 'answering' && <LiveRound room={room} answerText={answerText} setAnswerText={setAnswerText} onSubmit={() => {
      if (!answerText.trim()) return;
      setError('');
      submitAnswer.mutate({ code, data: { answer: answerText.trim() } }, {
        onSuccess: () => setAnswerText(''),
        onError: cause => setError(cause instanceof Error ? cause.message : 'Your answer could not be tucked away. Please try again.'),
      });
    }} onReveal={() => commit(revealAnswers as never, { code })} isSubmitting={submitAnswer.isPending} isRevealing={revealAnswers.isPending}/>}
    {room.phase === 'revealed' && <RoundResults room={room} onNext={() => commit(nextQuestion as never, { code })} isNext={nextQuestion.isPending}/>}
    {room.phase === 'finished' && <FinalResults room={room}/>}
  </BrandShell>;
}

function LoadingRoom() {
  return <section className="panel main-card" aria-label="Loading room" data-testid="status-room-loading"><div className="skeleton" style={{height:14,width:120,marginBottom:15}}/><div className="skeleton" style={{height:42,width:'67%',marginBottom:25}}/><div className="skeleton" style={{height:170,marginBottom:14}}/><div className="skeleton" style={{height:44,width:180}}/></section>;
}

function Lobby({ room, questions, setQuestions, onSave, onStart, saving, starting }: { room: RoomState; questions: string[]; setQuestions: (q: string[]) => void; onSave: () => void; onStart: () => void; saving: boolean; starting: boolean }) {
  const isHost = room.isHost;
  return <section className="room-grid arrive">
    <div className="panel main-card">
      <div className="section-kicker">Before the first scoop</div><h2 className="question-title">Make the questions yours.</h2>
      {isHost ? <><p className="body-copy" style={{fontSize:13}}>Ten little prompts, ten chances to see who knows the couple best. Edit them before you start.</p>
        <div className="question-editor">{questions.map((question, i) => <label className="question-row" key={i}><span className="question-index">{String(i + 1).padStart(2, '0')}</span><input className="text-input" aria-label={`Question ${i + 1}`} data-testid={`input-question-${i + 1}`} maxLength={280} value={question} onChange={e => setQuestions(questions.map((q, index) => index === i ? e.target.value : q))}/></label>)}</div>
        <div className="button-row"><button className="btn btn-soft" data-testid="button-save-questions" disabled={saving || questions.length !== 10 || questions.some(q => !q.trim())} onClick={onSave}>{saving ? 'Saving…' : 'Save all 10'}</button><button className="btn btn-primary" data-testid="button-start-game" disabled={starting || room.players.length < 1 || questions.length !== 10 || questions.some(q => !q.trim())} onClick={onStart}>{starting ? 'Starting…' : 'Start the game'} <ArrowRight size={16}/></button></div>
      </> : <div className="note-box">The host is choosing the questions. Take a look around and get ready to share your best Daniel-and-Amy knowledge.</div>}
    </div>
    <aside className="panel side-card">
      <div className="section-kicker"><Users size={13} style={{verticalAlign:'-2px',marginRight:5}}/>The table</div><h3 className="form-title" style={{marginTop:7,fontSize:23}}>{room.players.length} {room.players.length === 1 ? 'guest' : 'guests'} here</h3>
      {room.players.length ? <ul className="player-list">{room.players.map(player => <li className="player-row" key={player.id} data-testid={`player-${player.id}`}><span className="player-dot">{initials(player.displayName)}</span><span>{player.displayName}</span>{player.isHost && <span className="host-tag"><Crown size={11} style={{verticalAlign:'-2px'}}/> host</span>}</li>)}</ul> : <div className="empty-state"><div className="empty-mark"><Users size={21}/></div>Waiting for your first guest.</div>}
      <div className="note-box" style={{marginTop:18}}>Share the room code with guests. They can join from any phone, no sign-in needed.</div>
    </aside>
  </section>;
}

function LiveRound({ room, answerText, setAnswerText, onSubmit, onReveal, isSubmitting, isRevealing }: { room: RoomState; answerText: string; setAnswerText: (s: string) => void; onSubmit: () => void; onReveal: () => void; isSubmitting: boolean; isRevealing: boolean }) {
  return <section className="game-layout arrive">
    <article className="panel game-main">
      <div className="game-head"><span className="section-kicker">Round {room.round} of 10</span><span className="round-pill">{room.submittedCount ?? 0} answers tucked away</span></div>
      <h2 className="question-title" style={{padding:'0 24px',marginTop:11}}>{room.currentQuestion || 'What do you know about the couple?'}</h2>
      <ExcavationScene round={room.round} answers={room.answers} phase="answering"/>
      <div className="answer-area">
        {room.submitted ? <div className="note-box" data-testid="status-answer-submitted"><Check size={15} style={{verticalAlign:'-3px',marginRight:6}}/>Your answer is tucked under the ice. The host will reveal when everyone is ready.</div> :
          <div className="answer-input-row"><input className="text-input" data-testid="input-answer" maxLength={120} placeholder="Write what you think…" value={answerText} onChange={e => setAnswerText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}/><button className="btn btn-primary" data-testid="button-submit-answer" disabled={!answerText.trim() || isSubmitting} onClick={onSubmit}>{isSubmitting ? 'Tucking away…' : 'Tuck it in'} <Send size={15}/></button></div>}
        <p className="dig-instruction">Answers stay secret until the host lifts the lid.</p>
      </div>
    </article>
    <aside className="panel round-side"><span className="section-kicker">The room is thinking</span><h3>{room.submittedCount ?? 0} tucked away</h3><p>Your answer is private until the big reveal. Keep it kind, keep it specific.</p><div className="progress-track"><div className="progress-fill" style={{width:`${Math.min(100,((room.submittedCount ?? 0)/Math.max(1,room.players.length))*100)}%`}}/></div><p>{room.players.length} guests at the table</p>
      {room.isHost && <div style={{marginTop:20}}><button className="btn btn-primary" data-testid="button-reveal-answers" onClick={onReveal} disabled={isRevealing}>{isRevealing ? 'Lifting the lid…' : 'Reveal the answers'} <ArrowRight size={16}/></button></div>}
      {!room.isHost && <div className="note-box" style={{marginTop:18}}>The host will open the bowl when everyone has had a turn.</div>}
    </aside>
  </section>;
}

function RoundResults({ room, onNext, isNext }: { room: RoomState; onNext: () => void; isNext: boolean }) {
  const groups = room.answers ?? [];
  return <section className="result-grid arrive">
    <article className="panel main-card"><div className="section-kicker">Round {room.round} · the reveal</div><h2 className="question-title">What the room remembers.</h2><ExcavationScene round={room.round} answers={groups} phase="revealed"/>
      <div style={{marginTop:8}}>{groups.length ? groups.map((group, index) => <AnswerGroup key={`${group.answer}-${index}`} group={group}/>) : <div className="empty-state"><div className="empty-mark">?</div>No answers made it into this scoop.</div>}</div>
      {room.isHost && <button className="btn btn-primary" data-testid="button-next-round" style={{marginTop:20}} onClick={onNext} disabled={isNext}>{isNext ? 'Scooping the next round…' : room.round >= 10 ? 'See final standings' : 'Next question'} <ArrowRight size={16}/></button>}
      {!room.isHost && <p className="status-line">The host will move the spoon to the next question.</p>}
    </article>
    <aside className="panel side-card"><span className="section-kicker">Current standings</span><h3 className="form-title" style={{fontSize:23,marginTop:8}}>Who’s on a roll?</h3><Standings standings={room.standings}/></aside>
  </section>;
}

function FinalResults({ room }: { room: RoomState }) {
  return <section className="panel main-card arrive">
    <div className="section-kicker">The last spoonful</div><h2 className="question-title" style={{fontSize:'clamp(37px,6vw,62px)'}}>A bowl full of<br/>good memories.</h2>
    <p className="body-copy">Ten questions, one very loved couple, and a table full of people who know them by heart.</p>
    <div className="result-grid" style={{marginTop:20}}>
      <div><div className="section-kicker">Final standings</div><Standings standings={room.standings} final/></div>
      <div className="panel side-card" style={{boxShadow:'none',background:'#fff4df'}}><div className="section-kicker">A note for Daniel + Amy</div><h3 className="form-title" style={{fontSize:25,marginTop:8}}>Look how well-loved you are.</h3><p className="body-copy" style={{fontSize:13}}>Every scoop held a story. Thanks for letting everyone add theirs to the bowl.</p><DessertMini/></div>
    </div>
    <Link href="/" className="btn btn-soft" data-testid="link-play-again" style={{marginTop:22}}><RotateCcw size={15}/> Start another room</Link>
  </section>;
}

function AnswerGroup({ group }: { group: GroupedAnswer }) {
  const ingredient = ingredients.find(item => item.name.toLowerCase() === group.ingredient.toLowerCase()) ?? ingredients[0];
  return <div className="answer-group" data-testid={`answer-group-${group.answer.replace(/\s/g,'-').slice(0,18)}`}><IngredientBadge kind={ingredient.icon}/><div><div className="group-answer">{group.answer}</div><div className="group-meta">{group.players?.join(', ') || 'A secret scoop'} · {group.count} {group.count === 1 ? 'person' : 'people'} · {group.tier || ingredient.tier}</div></div><div className="group-points">+{group.points}</div></div>;
}

function Standings({ standings, final = false }: { standings: Standing[]; final?: boolean }) {
  if (!standings?.length) return <div className="empty-state"><div className="empty-mark">—</div>Points appear after the first reveal.</div>;
  return <div>{standings.slice().sort((a,b) => b.points - a.points).map((player, index) => <div className="standing-row" key={player.playerId} data-testid={`standing-${player.playerId}`}><span className="rank-badge">{index === 0 && final ? <Crown size={14}/> : index + 1}</span><div><div className="standing-name">{player.displayName}</div><div className="standing-small">{player.discoveries} {player.discoveries === 1 ? 'discovery' : 'discoveries'}</div></div><strong className="standing-points">{player.points}</strong></div>)}</div>;
}

function SoloPage() {
  const [ingredient, setIngredient] = useState(ingredients[0]);
  const [answer, setAnswer] = useState('');
  const [scoops, setScoops] = useState(0);
  const [sound, setSound] = useState(false);
  const reset = () => setScoops(0);
  return <BrandShell>
    <div className="page-heading arrive"><div><span className="preview-tag">Solo preview · not a scored round</span><h1 style={{marginTop:12}}>A little taste<br/>of the dig.</h1></div><Link href="/" className="btn btn-soft" data-testid="link-solo-back">Back to room setup</Link></div>
    <div className="solo-layout">
      <article className="panel game-main">
        <div className="game-head"><span className="section-kicker">Pick a layer · preview only</span><button className="btn btn-soft" data-testid="button-solo-reset" onClick={reset} style={{minHeight:36,padding:'7px 11px'}}><RotateCcw size={14}/> Reset</button></div>
        <h2 className="question-title" style={{padding:'0 24px',marginTop:12}}>What sweet thing should we find?</h2>
        <ExcavationScene round={0} answers={[]} phase="solo" selected={ingredient} onDig={() => setScoops(prev => prev + 1)} digs={scoops}/>
        <div className="answer-area"><label className="field-label" htmlFor="solo-answer">Type a pretend answer</label><input id="solo-answer" className="text-input" data-testid="input-solo-answer" maxLength={120} placeholder="e.g. a 2am dumpling run" value={answer} onChange={e => setAnswer(e.target.value)}/><p className="dig-instruction">Preview answers are not sent or scored.</p></div>
      </article>
      <aside className="panel side-card"><span className="section-kicker">Choose your ingredient</span><h3 className="form-title" style={{fontSize:22,marginTop:7}}>Ten layers to uncover</h3><p className="form-subtitle">Tap any ingredient to preview its depth and reward.</p><div className="ingredient-grid">{ingredients.map(item => <button key={item.name} className={`ingredient-choice ${item.name === ingredient.name ? 'selected' : ''}`} data-testid={`button-ingredient-${item.icon}`} onClick={() => setIngredient(item)}><IngredientBadge kind={item.icon}/><span>{item.name}</span></button>)}</div><div className="note-box"><strong>{ingredient.name}</strong> · {ingredient.tier}<br/>A visual preview only. No rarity math, no points.</div><button className="btn btn-soft" style={{marginTop:13}} data-testid="button-sound-toggle" onClick={() => setSound(!sound)}>{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>} {sound ? 'Sound on' : 'Sound off'}</button></aside>
    </div>
  </BrandShell>;
}

function DessertMini() {
  return <div style={{height:100,display:'grid',placeItems:'center',marginTop:8}}><svg width="150" height="100" viewBox="0 0 150 100" aria-hidden="true"><path d="M24 49q50 22 102 0l-11 36q-39 18-79 0Z" fill="#d87888" stroke="#694f42" strokeWidth="3"/><path d="M28 49q44-39 92 0-45 22-92 0Z" fill="#fff4dc" stroke="#694f42" strokeWidth="3"/><circle cx="72" cy="38" r="9" fill="#ba86c2" stroke="#694f42" strokeWidth="2"/><circle cx="49" cy="49" r="7" fill="#e9838c" stroke="#694f42" strokeWidth="2"/><circle cx="93" cy="48" r="7" fill="#f1bf58" stroke="#694f42" strokeWidth="2"/><path d="m106 9-28 37" stroke="#b77a4f" strokeWidth="8" strokeLinecap="round"/></svg></div>;
}

function initials(name: string) { return name.trim().split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase(); }

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Home}/><Route path="/room/:code" component={RoomPage}/><Route path="/solo" component={SoloPage}/><Route component={NotFound}/></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}

export default App;

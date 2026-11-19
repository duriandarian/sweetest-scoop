import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetRoomQueryKey, useGetRoom, useJoinRoom, useNextQuestion, useStartGame, useSubmitAnswer, useUpdateProfile } from '@workspace/api-client-react';
import type { RoomState } from '@workspace/api-client-react';
import { Check, Copy, Timer } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { AvatarPicker, Lobby } from './Lobby';
import './player-dive.css';
import { Answering, Finished, Revealed } from './Round';
import { type AvatarId, type Room, sessionKey } from './theme';
import { DEFAULT_LOOK, encodeAvatar } from './wardrobe';
import { useMusicScene } from './MusicProvider';
import { MusicStatus } from './MusicStatus';

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export function RoomPage() {
  const { code: raw = '' } = useParams<{ code: string }>();
  const code = raw.toUpperCase();
  const qc = useQueryClient();
  const [token, setToken] = useState(() => localStorage.getItem(sessionKey(code)) ?? '');
  useEffect(() => { setToken(localStorage.getItem(sessionKey(code)) ?? ''); }, [code]);
  const request = useMemo(() => ({ headers: { 'X-Session-Token': token } }), [token]);
  const queryKey = useMemo(() => [...getGetRoomQueryKey(code), token], [code, token]);
  const roomQuery = useGetRoom(code, { request, query: { queryKey, enabled: !!token, refetchInterval: 1000, retry: 2 } });
  const room = roomQuery.data as Room | undefined;

  // server clock offset, recalibrated on every response
  const offset = useRef(0);
  useEffect(() => { if (room?.serverNow) offset.current = Date.parse(room.serverNow) - Date.now(); }, [room?.serverNow, roomQuery.dataUpdatedAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(id); }, []);
  const remainingMs = room?.phase === 'answering' && room.roundEndsAt ? Date.parse(room.roundEndsAt) - (now + offset.current) : null;
  useMusicScene(room?.isHost ? room.phase === 'answering' && (remainingMs === null || remainingMs > 0) ? 'round' : 'cafe' : 'silent',
    !!room?.isHost && remainingMs !== null && remainingMs > 0 && remainingMs <= 10000);

  const apply = (next: RoomState) => { qc.setQueryData(queryKey, next); void qc.invalidateQueries({ queryKey: getGetRoomQueryKey(code) }); };
  const [error, setError] = useState('');
  const opts = (fallback: string) => ({ onSuccess: (r: RoomState) => { setError(''); apply(r); }, onError: (e: unknown) => setError(msg(e, fallback)) });

  const startGame = useStartGame({ request });
  const submitAnswer = useSubmitAnswer({ request });
  const nextQuestion = useNextQuestion({ request });
  const updateProfile = useUpdateProfile({ request });
  const [pendingAvatar, setPendingAvatar] = useState<AvatarId | null>(null);
  const avatar = pendingAvatar ?? room?.avatar ?? 'mango';
  const pickAvatar = (id: AvatarId) => { setPendingAvatar(id); updateProfile.mutate({ code, data: { avatar: id } }, { onSuccess: r => { apply(r); setPendingAvatar(null); }, onError: e => { setPendingAvatar(null); setError(msg(e, 'Could not save your Bobi.')); } }); };

  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ } };

  if (!token || (!room && roomQuery.isError)) return <JoinGate code={code} failed={!!token} onToken={t => { localStorage.setItem(sessionKey(code), t); setToken(t); }}/>;
  if (!room) return <div className="g-screen"><div className="g-skel-wrap" data-testid="status-room-loading"><div className="g-skel" style={{ width: 140, height: 14 }}/><div className="g-skel" style={{ width: '70%', height: 44 }}/><div className="g-skel" style={{ height: 280 }}/><div className="g-skel" style={{ height: 56 }}/></div></div>;

  const myTotal = room.myTotalPoints;
  const secs = remainingMs == null ? null : Math.max(0, Math.ceil(remainingMs / 1000));
  const urgency = remainingMs != null && room.roundDuration ? Math.max(0, Math.min(1, remainingMs / (room.roundDuration * 1000))) : 1;
  return <div className={`g-screen phase-${room.phase}`}>
    <header className="g-bar">
      <div className="g-left"><Link href="/" className="g-brand" data-testid="link-home">Daniel <i>+</i> Amy</Link>{!room.isHost && typeof myTotal === 'number' && <span className="g-hud" data-testid="text-my-total"><small>Total</small>{myTotal}</span>}</div>
      {secs != null && <div className={`g-timer ${secs <= 10 ? 'is-low' : ''}`} data-testid="text-timer" style={{ ['--t' as string]: urgency }}><Timer size={14}/>{secs > 0 ? `${secs}s` : 'Time'}</div>}
      <button className="g-code" onClick={copy} data-testid="button-copy-room" aria-label="Copy room code"><span>Room</span><b data-testid="text-room-code">{room.code}</b>{copied ? <Check size={14}/> : <Copy size={14}/>}</button>
    </header>
    {error && room.phase !== 'answering' && <div className="g-error g-error-bar" role="alert" data-testid="status-room-error">{error} <button onClick={() => { setError(''); void roomQuery.refetch(); }}>Retry</button></div>}
    {roomQuery.isError && <div className="g-error g-error-bar" role="alert">Connection interrupted. Reconnecting to the room; the server timer continues.</div>}
    <main className="g-main">
      {room.isHost && room.phase !== 'answering' && <MusicStatus/>}
      {room.phase === 'lobby' && <Lobby room={room} avatar={avatar} onAvatar={pickAvatar} savingAvatar={updateProfile.isPending}
        onStart={() => startGame.mutate({ code }, opts('Could not start the game.'))} starting={startGame.isPending}/>}
      {room.phase === 'answering' && <Answering key={room.round} room={room} avatar={avatar} remainingMs={remainingMs} error={error} submitting={submitAnswer.isPending}
        hud={!room.isHost ? <details className="qp-menu">
          <summary aria-label="Room options"><Copy size={16}/></summary>
          <div className="qp-menu-body">
            <button className="qp-menu-btn" onClick={copy} data-testid="button-copy-playing-room">{copied ? <Check size={14}/> : <Copy size={14}/>} Room {room.code}</button>
            <Link href="/" className="qp-menu-btn">Back to menu</Link>
          </div>
        </details> : undefined}
        onSubmit={answer => submitAnswer.mutate({ code, data: { answer, round: room.round } }, opts('Your answer did not lock. Try again.'))}/>}
      {room.phase === 'revealed' && <Revealed room={room} avatar={avatar} onNext={() => nextQuestion.mutate({ code }, opts('Could not move on.'))} nexting={nextQuestion.isPending}/>}
      {room.phase === 'finished' && <Finished room={room}/>}
    </main>
  </div>;
}

function JoinGate({ code, failed, onToken }: { code: string; failed: boolean; onToken: (t: string) => void }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>(() => encodeAvatar(DEFAULT_LOOK));
  const [err, setErr] = useState('');
  const join = useJoinRoom();
  const submit = (e: FormEvent) => { e.preventDefault(); setErr(''); join.mutate({ code, data: { displayName: name.trim(), avatar } }, { onSuccess: s => onToken(s.sessionToken), onError: x => setErr(msg(x, 'Could not join this room.')) }); };
  return <div className="g-screen"><main className="g-main"><form className="g-card gate g-arrive" onSubmit={submit}>
    <p className="g-kicker">Room {code}</p><h1 className="g-title">Come take a seat.</h1>
    {failed && <p className="g-error">Your old seat expired. Join again with your name.</p>}
    <input className="g-input" data-testid="input-room-join-name" required maxLength={32} placeholder="Your name" value={name} onChange={e => setName(e.target.value)}/>
    <AvatarPicker value={avatar} onPick={setAvatar} busy={join.isPending}/>
    <button className="g-btn g-btn-primary wide" disabled={join.isPending || !name.trim()} data-testid="button-room-join">{join.isPending ? 'Joining...' : 'Join the table'}</button>
    {err && <p className="g-error" role="alert">{err}</p>}
    <Link href="/" className="g-link" data-testid="link-back-home">Back to the beginning</Link>
  </form></main></div>;
}

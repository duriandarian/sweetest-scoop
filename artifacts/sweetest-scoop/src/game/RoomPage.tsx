import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetRoomQueryKey, getRoom, submitAnswer, useGetRoom, useJoinRoom, useNextQuestion, useStartGame, useSubmitAnswer, useUpdateProfile } from '@workspace/api-client-react';
import type { AnswerCorrection, RoomEntryProblem, RoomState } from '@workspace/api-client-react';
import { Check, Copy, Timer } from 'lucide-react';
import { Link, useParams, useSearch } from 'wouter';
import { AvatarPicker, Lobby } from './Lobby';
import './player-dive.css';
import { Answering, Finished, Revealed } from './Round';
import { GAME_TITLE, type AvatarId, type Room, sessionKey } from './theme';
import { roomCodeProblem, roomEntryFailure, roomNameProblem } from './room-entry';
import { RoomNameField } from './RoomEntryField';
import { DEFAULT_LOOK, encodeAvatar } from './wardrobe';
import { useMusicScene } from './MusicProvider';
import { MusicStatus } from './MusicStatus';
import { roomPollingInterval } from './room-polling';
import { reconcileRoom, sessionRejected } from './room-recovery';
import { useLiveRoundClock } from './live-round-clock';
import { RoundReady } from './RoundReady';
import { previewPartyBobi } from './PartyBobiArt';
import { PartyBobiCard } from './PartyBobiCard';
import { withRequestDeadline } from './request-deadline';
import { ShareMyScore } from './ScoreRecap';
import { roomInviteFromSearch, roomInviteUrl } from './room-invite';

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

type HostTurn = { queryKey: readonly string[]; phase: 'lobby' | 'revealed'; round: number };
type HostNotice = { turn: HostTurn; message: string; refreshAfter?: number };
const atHostTurn = (room: RoomState | undefined, turn: HostTurn) =>
  room?.isHost && room.phase === turn.phase && room.round === turn.round;
const sameHostTurn = (a: HostTurn | null | undefined, b: HostTurn | null) =>
  !!a && !!b && a.queryKey === b.queryKey && a.phase === b.phase && a.round === b.round;

export function RoomPage() {
  const { code: raw = '' } = useParams<{ code: string }>();
  const code = raw.toUpperCase();
  const inviteRoomId = roomInviteFromSearch(useSearch());
  const qc = useQueryClient();
  const [token, setToken] = useState(() => localStorage.getItem(sessionKey(code)) ?? '');
  useEffect(() => { setToken(localStorage.getItem(sessionKey(code)) ?? ''); }, [code]);
  const request = useMemo(() => ({ headers: { 'X-Session-Token': token } }), [token]);
  const queryKey = useMemo(() => [...getGetRoomQueryKey(code), token], [code, token]);
  const [pollJitter] = useState(() => Math.floor(Math.random() * 400));
  const roomQuery = useGetRoom(code, { request, query: { queryKey, enabled: !!token && inviteRoomId !== null,
    queryFn: ({ signal }) => withRequestDeadline(deadline => getRoom(code, { ...request, signal: deadline }), undefined, signal),
    refetchInterval: query => roomPollingInterval(query.state.data?.phase, !!query.state.data?.isHost, pollJitter),
    networkMode: 'always', refetchOnReconnect: true, retry: false,
    structuralSharing: (previous, incoming) => reconcileRoom(previous as RoomState | undefined, incoming as RoomState) } });
  const room = roomQuery.data as Room | undefined;

  const { startsInMs, remainingMs } = useLiveRoundClock(room, roomQuery.dataUpdatedAt);
  const gettingReady = startsInMs > 0;
  useMusicScene(room?.isHost ? room.phase === 'answering' && !gettingReady && (remainingMs === null || remainingMs > 0) ? 'round' : 'cafe' : 'silent',
    !!room?.isHost && remainingMs !== null && remainingMs > 0 && remainingMs <= 10000);

  const apply = (next: RoomState) => { qc.setQueryData(queryKey, next); void qc.invalidateQueries({ queryKey: getGetRoomQueryKey(code) }); };
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [correction, setCorrection] = useState<AnswerCorrection | null>(null);
  useEffect(() => { setError(''); setFeedback(''); setCorrection(null); }, [code, room?.round, room?.phase, room?.submitted]);

  const startGame = useStartGame({ request, mutation: { retry: false, networkMode: 'always' } });
  const nextQuestion = useNextQuestion({ request, mutation: { retry: false, networkMode: 'always' } });
  const [pendingHostTurn, setPendingHostTurn] = useState<HostTurn | null>(null);
  const [hostNotice, setHostNotice] = useState<HostNotice | null>(null);
  const hostAction = useRef<HostTurn | null>(null);
  const hostTurn: HostTurn | null = room?.isHost && (room.phase === 'lobby' || room.phase === 'revealed')
    ? { queryKey, phase: room.phase, round: room.round } : null;
  const notice = hostNotice && sameHostTurn(hostNotice.turn, hostTurn) ? hostNotice : null;
  const hostNeedsRefresh = notice?.refreshAfter !== undefined && roomQuery.dataUpdatedAt <= notice.refreshAfter;
  const hostBusy = sameHostTurn(pendingHostTurn, hostTurn) || hostNeedsRefresh;
  const progressHost = async () => {
    const turn = hostTurn;
    // The ref catches two clicks before the disabled button renders. A fresh
    // cache check also keeps a stale button from acting on a newer screen.
    if (!turn || hostNeedsRefresh || sameHostTurn(hostAction.current, turn) ||
      !atHostTurn(qc.getQueryData<RoomState>(turn.queryKey), turn)) return;
    hostAction.current = turn;
    setPendingHostTurn(turn);
    setHostNotice(null);
    try {
      const next = turn.phase === 'lobby' ? await startGame.mutateAsync({ code })
        : await nextQuestion.mutateAsync({ code, data: { round: turn.round } });
      apply(next);
    } catch (e) {
      // A lost reply is not a failed write. Check state without sending a
      // second command, and don't report a failure on an already newer screen.
      if (hostAction.current !== turn || !atHostTurn(qc.getQueryData<RoomState>(turn.queryKey), turn)) return;
      const refreshed = await roomQuery.refetch();
      if (hostAction.current !== turn || !atHostTurn(qc.getQueryData<RoomState>(turn.queryKey), turn)) return;
      const status = typeof e === 'object' && e !== null && 'status' in e ? e.status : null;
      const fallback = turn.phase === 'lobby' ? 'Still in the lobby. You can try Start again.'
        : `Still showing round ${turn.round} results. You can try again.`;
      setHostNotice({ turn, message: status === 400 || status === 409 ? msg(e, fallback) : fallback,
        refreshAfter: refreshed.isError ? refreshed.dataUpdatedAt : undefined });
    } finally {
      if (hostAction.current === turn) {
        hostAction.current = null;
        setPendingHostTurn(null);
      }
    }
  };

  const submit = useSubmitAnswer({ mutation: { networkMode: 'always', retry: false,
    mutationFn: ({ code, data }) => withRequestDeadline(signal => submitAnswer(code, data, { ...request, signal })),
  } });
  const updateProfile = useUpdateProfile({ request });
  const [pendingAvatar, setPendingAvatar] = useState<AvatarId | null>(null);
  const avatar = pendingAvatar ?? room?.avatar ?? 'mango';
  const pickAvatar = (id: AvatarId) => { setPendingAvatar(id); updateProfile.mutate({ code, data: { avatar: id } }, { onSuccess: r => { apply(r); setPendingAvatar(null); }, onError: e => { setPendingAvatar(null); setError(msg(e, 'Could not save your Bobi.')); } }); };

  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ } };

  const differentRoom = room && inviteRoomId !== undefined && room.roomInstanceId !== inviteRoomId;
  const rejectedSeat = sessionRejected(roomQuery.error);
  if (inviteRoomId === null || !token || rejectedSeat || differentRoom) return <JoinGate key={`${code}:${inviteRoomId}`} code={code}
    inviteRoomId={inviteRoomId} failed={!!token && rejectedSeat} onToken={t => { localStorage.setItem(sessionKey(code), t); setToken(t); }}/>;
  if (!room && (roomQuery.isError || roomQuery.errorUpdatedAt > 0)) return <div className="g-screen"><main className="g-main"><div className="g-card" role="alert">
    <h1>Reconnecting to your seat.</h1><p>Your session is saved. The server timer continues while your phone reconnects.</p>
    <button className="g-btn g-btn-primary" onClick={() => { void roomQuery.refetch(); }}>Retry connection</button>
  </div></main></div>;
  if (!room) return <div className="g-screen"><div className="g-skel-wrap" data-testid="status-room-loading"><div className="g-skel" style={{ width: 140, height: 14 }}/><div className="g-skel" style={{ width: '70%', height: 44 }}/><div className="g-skel" style={{ height: 280 }}/><div className="g-skel" style={{ height: 56 }}/></div></div>;

  const myTotal = room.myTotalPoints;
  const secs = remainingMs == null ? null : Math.max(0, Math.ceil(remainingMs / 1000));
  const urgency = remainingMs != null && room.roundDuration ? Math.max(0, Math.min(1, remainingMs / (room.roundDuration * 1000))) : 1;
  return <div className={`g-screen phase-${room.phase}`}>
    <header className="g-bar">
      <div className="g-left"><Link href="/" className="g-brand" data-testid="link-home">{GAME_TITLE}</Link>{!room.isHost && typeof myTotal === 'number' && <span className="g-hud" data-testid="text-my-total"><small>Total</small>{myTotal}</span>}</div>
      {!room.isHost && secs != null && <div className={`g-timer ${secs <= 10 ? 'is-low' : ''}`} data-testid="text-timer" style={{ ['--t' as string]: urgency }}><Timer size={14}/>{secs > 0 ? `${secs}s` : 'Time'}</div>}
      {!(room.isHost && room.phase === 'lobby') && <button className="g-code" onClick={copy} data-testid="button-copy-room" aria-label="Copy room code"><span>Room</span><b data-testid="text-room-code">{room.code}</b>{copied ? <Check size={14}/> : <Copy size={14}/>}</button>}
    </header>
    {error && room.phase !== 'answering' && <div className="g-error g-error-bar" role="alert" data-testid="status-room-error">{error} <button onClick={() => { setError(''); void roomQuery.refetch(); }}>Retry</button></div>}
    {notice && <div className="g-error g-error-bar" role="status" data-testid="status-host-action">
      {hostNeedsRefresh ? <>Could not confirm the host action. <button data-testid="button-check-host-room" onClick={() => { void roomQuery.refetch(); }}>Check room</button></> : notice.message}
    </div>}
    {roomQuery.isError && <div className="g-error g-error-bar" role="alert">Connection interrupted. Reconnecting to the room; the server timer continues.</div>}
    <main className="g-main">
      {room.isHost && (room.phase !== 'answering' || gettingReady) && <MusicStatus/>}
      {room.phase === 'lobby' && <Lobby room={room} avatar={avatar} onAvatar={pickAvatar} savingAvatar={updateProfile.isPending}
        onStart={progressHost} starting={hostBusy}
        inviteUrl={room.isHost && room.roomInstanceId ? roomInviteUrl(window.location.origin, import.meta.env.BASE_URL, room.code, room.roomInstanceId) : undefined}/>}
      {room.phase === 'answering' && gettingReady && <RoundReady round={room.round} questionCount={room.questionCount} startsInMs={startsInMs}/>}
      {room.phase === 'answering' && !gettingReady && <Answering key={room.round} room={room} avatar={avatar} remainingMs={remainingMs} error={error} feedback={feedback} correction={correction} onDraftChange={() => { setError(''); setFeedback(''); setCorrection(null); }} submitting={submit.isPending && submit.variables?.code === code && submit.variables.data.round === room.round}
        hud={!room.isHost ? <details className="qp-menu">
          <summary aria-label="Room options"><Copy size={16}/></summary>
          <div className="qp-menu-body">
            <button className="qp-menu-btn" onClick={copy} data-testid="button-copy-playing-room">{copied ? <Check size={14}/> : <Copy size={14}/>} Room {room.code}</button>
            <Link href="/" className="qp-menu-btn">Back to menu</Link>
          </div>
        </details> : undefined}
        onSubmit={answer => {
          const submittedRound = room.round;
          setError(''); setFeedback('');
          submit.mutate({ code, data: { answer, round: submittedRound } }, {
            onSuccess: r => {
              // The server already returned the current room. Do not add a
              // redundant GET for every guest during a simultaneous answer burst.
              qc.setQueryData(queryKey, r);
              const current = qc.getQueryData<RoomState>(queryKey);
              if (current?.round !== submittedRound || current.phase !== 'answering' || current.submitted) return;
              setError(''); setFeedback(r.answerFeedback ?? ''); setCorrection(r.answerCorrection ?? null);
            },
            onError: () => {
              const current = qc.getQueryData<RoomState>(queryKey);
              if (current?.round === submittedRound && current.phase === 'answering' && !current.submitted) {
                setFeedback(''); setCorrection(null);
                setError('Could not confirm your answer. We’re checking if it locked. If it doesn’t, you can try again before time runs out.');
              }
              // A missing response does not mean the transaction failed. Recover
              // the canonical answer instead of retrying or trusting the draft.
              void roomQuery.refetch({ cancelRefetch: false });
            },
          });
        }}/>}
      {room.phase === 'revealed' && <Revealed room={room} avatar={avatar} onNext={progressHost} nexting={hostBusy}/>}
      {room.phase === 'finished' && <Finished room={room}
        share={!room.isHost && <ShareMyScore key={`${code}:${token}`} code={code} token={token}/>}/>}
    </main>
  </div>;
}

function JoinGate({ code, inviteRoomId, failed, onToken }: { code: string; inviteRoomId?: string | null; failed: boolean; onToken: (t: string) => void }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>(() => encodeAvatar(DEFAULT_LOOK));
  const special = previewPartyBobi(name);
  const [error, setError] = useState<RoomEntryProblem | null>(null);
  const join = useJoinRoom();
  const codeError = inviteRoomId === null
    ? { field: 'code' as const, error: 'This invite link is incomplete. Scan again or type the latest room code.' }
    : roomCodeProblem(code);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (join.isPending) return;
    const problem = codeError ?? roomNameProblem(name);
    setError(problem);
    if (!problem) join.mutate({ code, data: { displayName: name, avatar: special ? undefined : avatar, inviteRoomId: inviteRoomId ?? undefined } },
      { onSuccess: s => onToken(s.sessionToken), onError: x => setError(roomEntryFailure(x, !!inviteRoomId)) });
  };
  if (codeError) return <div className="g-screen"><main className="g-main"><div className="g-card gate g-arrive">
    <h1 className="g-title">Check the room link.</h1>
    <p className="g-error" role="alert">{codeError.error}</p>
    <Link href="/" className="g-link">Back to the menu</Link>
  </div></main></div>;
  return <div className="g-screen"><main className="g-main"><form className="g-card gate g-arrive" onSubmit={submit} noValidate>
    <p className="g-kicker">Room {code}</p>
    {error?.field === 'code' && <p className="g-feedback-coral" role="alert">{error.error}</p>}
    <h1 className="g-title">Come take a seat.</h1>
    {failed && <p className="g-error">Your old seat expired. Join again with your name.</p>}
    <RoomNameField value={name} readOnly={join.isPending} error={error?.field === 'name' ? error.error : undefined}
      inputTestId="input-room-join-name" errorTestId="status-room-join-name-error"
      onChange={e => { setName(e.target.value); setError(current => current?.field === 'code' ? current : null); }}/>
    {error && !error.field && <p className="g-error" role="alert">{error.error}</p>}
    <button className="g-btn g-btn-primary wide" disabled={join.isPending} data-testid="button-room-join">{join.isPending ? 'Joining...' : 'Join room'}</button>
    <Link href="/" className="g-link" data-testid="link-back-home">{error?.field === 'code' ? 'Enter a different room code' : 'Back to the menu'}</Link>
    {special ? <PartyBobiCard avatar={special}/> : <AvatarPicker value={avatar} onPick={setAvatar} busy={join.isPending}/>}
  </form></main></div>;
}

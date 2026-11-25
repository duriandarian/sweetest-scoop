import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCreateRoom, useJoinRoom } from '@workspace/api-client-react';
import type { RoomEntryProblem } from '@workspace/api-client-react';
import { ArrowLeft, ArrowRight, MonitorPlay, Play, Smartphone } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { PhotoMenu } from './PhotoMenu';
import { AvatarPicker } from './Lobby';
import { BobiAvatar } from './BobiAvatar';
import { previewPartyBobi } from './PartyBobiArt';
import { PartyBobiCard } from './PartyBobiCard';
import { type AvatarId, sessionKey } from './theme';
import { DEFAULT_LOOK, encodeAvatar } from './wardrobe';
import { useMusicScene } from './MusicProvider';
import { MusicStatus } from './MusicStatus';
import { roomCodeProblem, roomEntryFailure, roomNameProblem } from './room-entry';
import { RoomEntryField, RoomNameField } from './RoomEntryField';
import { parseCustomQuestions, type CustomImportResult } from '@workspace/scoop-rules';
import { CustomGameSetup } from './CustomGameSetup';
import { readCustomRoomDraft, saveCustomRoomDraft } from './custom-room-draft';

export function Home() {
  useMusicScene('cafe');
  const [screen, setScreen] = useState<'menu' | 'host' | 'join'>(() => readCustomRoomDraft().open ? 'host' : 'menu');
  return screen === 'menu'
    ? <PhotoMenu onChoose={setScreen}/>
    : <RoomSetup initial={screen} onBack={() => setScreen('menu')}/>;
}

export function RoomSetup({ initial, onBack }: { initial: 'host' | 'join'; onBack: () => void }) {
  const [, go] = useLocation();
  const [mode, setMode] = useState<'join' | 'host'>(initial);
  const [saved] = useState(readCustomRoomDraft);
  const [name, setName] = useState(initial === 'host' ? saved.name : '');
  const [custom, setCustom] = useState(initial === 'host' && saved.open);
  const [draft, setDraft] = useState(saved.text);
  const [preview, setPreview] = useState<CustomImportResult>();
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>(() => encodeAvatar(DEFAULT_LOOK));
  const special = mode === 'join' ? previewPartyBobi(name) : undefined;
  const [error, setError] = useState<RoomEntryProblem | null>(null);
  const create = useCreateRoom();
  const join = useJoinRoom();
  const done = (s: { sessionToken: string; room: { code: string } }) => { localStorage.setItem(sessionKey(s.room.code), s.sessionToken); go(`/room/${s.room.code}`); };
  const busy = create.isPending || join.isPending;
  const fail = (e: unknown) => setError(roomEntryFailure(e));
  const previewReady = !!preview?.questions.length && !preview.issues.length;
  const changeDraft = (text: string) => {
    setDraft(text); setPreview(undefined);
    setError(current => current?.field ? current : null);
    saveCustomRoomDraft({ text, name, open: true });
  };
  const changeGame = (next: boolean) => {
    setCustom(next); setError(current => current?.field ? current : null);
    saveCustomRoomDraft({ text: draft, name, open: next });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const roomCode = code.trim().toUpperCase();
    const problem = (mode === 'join' ? roomCodeProblem(roomCode) : null) ?? roomNameProblem(name);
    setError(problem);
    if (problem) return;
    if (mode === 'host') {
      if (custom && (!previewReady || error?.issues?.length)) return;
      create.mutate({ data: { hostName: name, ...(custom ? { customQuestionsTsv: draft } : {}) } },
        { onSuccess: session => { if (custom) saveCustomRoomDraft(null); done(session); }, onError: fail });
    }
    else join.mutate({ code: roomCode, data: { displayName: name, avatar: special ? undefined : avatar } }, { onSuccess: done, onError: fail });
  };
  const switchMode = (next: 'join' | 'host') => {
    if (mode === 'host' && custom) saveCustomRoomDraft({ text: draft, name, open: false });
    else if (next === 'host' && custom) saveCustomRoomDraft({ text: draft, name, open: true });
    setMode(next); setError(null);
  };
  const back = () => {
    if (mode === 'host' && custom) saveCustomRoomDraft({ text: draft, name, open: false });
    onBack();
  };
  return <div className="g-screen home-forms-screen">
    <header className="g-bar"><button className="g-link" onClick={back} disabled={busy} data-testid="button-back-story"><ArrowLeft size={15}/> Menu</button><span className="g-brand">Daniel <i>+</i> Amy</span><Link href="/solo" className="g-link" data-testid="link-solo"><Play size={14}/> Practice</Link></header>
    <main className={`g-main home-grid g-arrive${mode === 'host' && custom ? ' home-grid-custom' : ''}`}>
      <div className="home-hero">{mode === 'join' && <BobiAvatar avatar={special ?? avatar} size={56}/>}<div className="home-intro">
        <h1 className="g-title">The Sweetest Scoop</h1><p className="g-sub">{mode === 'host' ? 'Host the party here. Players join on their phones.' : 'Play on your phone. Follow the big screen.'}</p><MusicStatus/>
      </div></div>
      <form className="g-card" onSubmit={submit} noValidate>
        <span className={`role-pill ${mode === 'host' ? 'is-host' : ''}`} data-testid="text-role">{mode === 'host' ? <><MonitorPlay size={13}/> Host · main screen</> : <><Smartphone size={13}/> Guest · phone</>}</span>
        <div className="seg" role="tablist"><button type="button" role="tab" aria-selected={mode === 'join'} className={mode === 'join' ? 'on' : ''} disabled={busy} onClick={() => switchMode('join')} data-testid="tab-join">Join room</button><button type="button" role="tab" aria-selected={mode === 'host'} className={mode === 'host' ? 'on' : ''} disabled={busy} onClick={() => switchMode('host')} data-testid="tab-host">Create room</button></div>
        {mode === 'join' && <RoomEntryField className="g-input code" label="Room code" inputTestId="input-room-code" errorTestId="status-home-error"
          error={error?.field === 'code' ? error.error : undefined} value={code} required maxLength={6} placeholder="Code on host screen"
          inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} readOnly={busy}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(current => current?.field === 'name' ? current : null); }}/>}
        <RoomNameField value={name} readOnly={busy} error={error?.field === 'name' ? error.error : undefined}
          inputTestId={mode === 'host' ? 'input-host-name' : 'input-guest-name'} errorTestId="status-home-error"
           onChange={e => {
             const text = e.target.value;
             setName(text);
             setError(current => current?.field === 'name' ? null : current);
             if (mode === 'host' && custom) saveCustomRoomDraft({ text: draft, name: text, open: true });
           }}/>
        {mode === 'host' && <p className="g-sub">The moderator runs the screen and does not compete.</p>}
        {mode === 'host' && <CustomGameSetup custom={custom} onMode={changeGame} draft={draft} onDraft={changeDraft} preview={preview}
          onPreview={() => { setError(current => current?.field ? current : null); setPreview(parseCustomQuestions(draft)); }}
          busy={busy} issues={error?.issues}/>}
        {error && !error.field && !error.issues?.length && <p className="g-error" role="alert" data-testid="status-home-error">{error.error}</p>}
        {mode === 'host' && custom && !previewReady && <p className="g-sub">Preview a valid set of questions before creating the room.</p>}
        <button className="g-btn g-btn-primary wide" disabled={busy || (mode === 'host' && custom && (!previewReady || !!error?.issues?.length))} data-testid={mode === 'host' ? 'button-create-room' : 'button-join-room'}>{busy ? 'One moment...' : mode === 'host' ? 'Create room' : 'Join room'} <ArrowRight size={16}/></button>
        {mode === 'join' && (special ? <PartyBobiCard avatar={special}/> : <><p className="g-kicker">Your Bobi style</p>
          <AvatarPicker value={avatar} onPick={setAvatar} busy={busy} status="Optional. You can also customize in the lobby."/></>)}
      </form>
    </main>
  </div>;
}

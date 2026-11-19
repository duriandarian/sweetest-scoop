import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCreateRoom, useJoinRoom } from '@workspace/api-client-react';
import { ArrowLeft, ArrowRight, MonitorPlay, Play, Smartphone } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { PhotoMenu } from './PhotoMenu';
import { AvatarPicker } from './Lobby';
import { BobiAvatar } from './BobiAvatar';
import { type AvatarId, sessionKey } from './theme';
import { DEFAULT_LOOK, encodeAvatar } from './wardrobe';
import { useMusicScene } from './MusicProvider';
import { MusicStatus } from './MusicStatus';

export function Home() {
  useMusicScene('cafe');
  const [screen, setScreen] = useState<'menu' | 'host' | 'join'>('menu');
  return screen === 'menu'
    ? <PhotoMenu onChoose={setScreen}/>
    : <Forms initial={screen} onBack={() => setScreen('menu')}/>;
}

function Forms({ initial, onBack }: { initial: 'host' | 'join'; onBack: () => void }) {
  const [, go] = useLocation();
  const [mode, setMode] = useState<'join' | 'host'>(initial);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>(() => encodeAvatar(DEFAULT_LOOK));
  const [error, setError] = useState('');
  const create = useCreateRoom();
  const join = useJoinRoom();
  const done = (s: { sessionToken: string; room: { code: string } }) => { localStorage.setItem(sessionKey(s.room.code), s.sessionToken); go(`/room/${s.room.code}`); };
  const fail = (e: unknown) => setError(e instanceof Error && e.message ? e.message : 'That did not go through. Try again.');
  const submit = (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (mode === 'host') create.mutate({ data: { hostName: name.trim(), avatar } }, { onSuccess: done, onError: fail });
    else join.mutate({ code: code.trim().toUpperCase(), data: { displayName: name.trim(), avatar } }, { onSuccess: done, onError: fail });
  };
  const busy = create.isPending || join.isPending;
  return <div className="g-screen home-forms-screen">
    <header className="g-bar"><button className="g-link" onClick={onBack} data-testid="button-back-story"><ArrowLeft size={15}/> Menu</button><span className="g-brand">Daniel <i>+</i> Amy</span><Link href="/solo" className="g-link" data-testid="link-solo"><Play size={14}/> Practice</Link></header>
    <main className="g-main home-grid g-arrive">
      <div className="home-hero"><BobiAvatar avatar={avatar} size={100}/><h1 className="g-title">The Sweetest Scoop</h1><p className="g-sub">Answer on your phone. Watch the big screen for Bobis, then see the podium together.</p><MusicStatus/></div>
      <form className="g-card" onSubmit={submit}>
        <span className={`role-pill ${mode === 'host' ? 'is-host' : ''}`} data-testid="text-role">{mode === 'host' ? <><MonitorPlay size={13}/> Host · main screen</> : <><Smartphone size={13}/> Guest · phone</>}</span>
        <div className="seg" role="tablist"><button type="button" role="tab" aria-selected={mode === 'join'} className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')} data-testid="tab-join">Join room</button><button type="button" role="tab" aria-selected={mode === 'host'} className={mode === 'host' ? 'on' : ''} onClick={() => setMode('host')} data-testid="tab-host">Create room</button></div>
        {mode === 'join' && <input className="g-input code" data-testid="input-room-code" required maxLength={12} placeholder="ROOM CODE" value={code} onChange={e => setCode(e.target.value.toUpperCase())}/>}
        <input className="g-input" data-testid={mode === 'host' ? 'input-host-name' : 'input-guest-name'} required maxLength={32} placeholder="Your name" value={name} onChange={e => setName(e.target.value)}/>
        {mode === 'host' && <p className="g-sub">The moderator runs the screen and does not compete.</p>}
        <p className="g-kicker">Your Bobi style</p>
        <AvatarPicker value={avatar} onPick={setAvatar} busy={busy} status="Saved when you join."/>
        <button className="g-btn g-btn-primary wide" disabled={busy || !name.trim()} data-testid={mode === 'host' ? 'button-create-room' : 'button-join-room'}>{busy ? 'One moment...' : mode === 'host' ? 'Create room' : 'Join room'} <ArrowRight size={16}/></button>
        {error && <p className="g-error" role="alert" data-testid="status-home-error">{error}</p>}
      </form>
    </main>
  </div>;
}

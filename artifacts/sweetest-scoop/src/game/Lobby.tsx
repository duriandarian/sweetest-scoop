import { useState } from 'react';
import { Check, Copy, ScanLine } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BobiAvatar } from './BobiAvatar';
import { isPartyBobi } from './PartyBobiArt';
import { PartyBobiCard } from './PartyBobiCard';
import { MilkTeaLobby } from './MilkTeaLobby';
import { type AvatarId, type PlayerLike, type Room } from './theme';
import { Wardrobe } from './Wardrobe';
import { ROUND_DURATION_SECONDS } from './round-countdown';

/** Back-compat name used by Home / JoinGate / Solo: the full wardrobe with live preview. */
export function AvatarPicker({ value, onPick, busy, status }: { value?: string | null; onPick: (id: AvatarId) => void; busy?: boolean; status?: string }) {
  return <Wardrobe value={value} onPick={onPick} busy={busy} status={status} compact/>;
}

function HostJoinCode({ code, inviteUrl, sample }: { code: string; inviteUrl?: string; sample?: boolean }) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setFeedback('copied');
    } catch {
      setFeedback('failed');
    }
  };
  return <section className={`lobby-join${inviteUrl ? ' with-invite' : ''}`} aria-labelledby="lobby-join-title" data-testid="host-lobby-join-code">
    <div className="lobby-join-manual">
      <h1 className="g-kicker" id="lobby-join-title">Room code</h1>
      <strong className="lobby-join-code" data-testid="text-room-code">{code}</strong>
      <div className="lobby-join-help">
        <p className="g-sub">Open the game on your phone and tap <b>Join room</b>.</p>
        <button type="button" className="lobby-copy" onClick={copy} data-testid="button-copy-room" aria-label="Copy room code">
          {feedback === 'copied' ? <Check size={14}/> : <Copy size={14}/>}
          <span aria-live="polite">{feedback === 'copied' ? 'Copied' : 'Copy code'}</span>
        </button>
      </div>
      {feedback === 'failed' && <p className="g-sub" role="status">Couldn’t copy. You can select and copy the code above.</p>}
    </div>
    {inviteUrl && <figure className="lobby-invite">
      <figcaption className="g-kicker"><ScanLine size={13} aria-hidden="true"/>{sample ? 'Sample QR code' : 'Scan to join'}</figcaption>
      <QRCodeSVG value={inviteUrl} size={184} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000"
        className="lobby-invite-qr" data-testid="lobby-invite-qr" role="img" aria-label={sample ? 'Sample join QR' : `Join room ${code} QR code`}/>
      <p className="g-sub">{sample ? 'Preview only. No room is created.' : 'Use your phone camera.'}</p>
    </figure>}
  </section>;
}

export function Lobby({ room, avatar, onAvatar, savingAvatar, onStart, starting, startLabel = 'Start round one', inviteUrl, sampleInvite }: {
  room: Room; avatar: string; onAvatar: (id: AvatarId) => void; savingAvatar: boolean; onStart: () => void; starting: boolean;
  startLabel?: string;
  inviteUrl?: string;
  sampleInvite?: boolean;
}) {
  const players = room.players as PlayerLike[];
  const guests = players.filter(p => !p.isHost);
  const duration = ROUND_DURATION_SECONDS;
  return <div className={`lobby g-arrive${room.isHost ? ' is-host-lobby' : ''}`}>
    {room.isHost && <HostJoinCode key={room.code} code={room.code} inviteUrl={inviteUrl} sample={sampleInvite}/>}
    <MilkTeaLobby players={players} isHost={!!room.isHost}/>
    {room.isHost && <section className="g-card lobby-wide">
      <div className="host-controls">
        <p className="g-sub" data-testid="text-round-duration">Up to {duration} seconds per question</p>
        <button className="g-btn g-btn-primary" onClick={onStart} disabled={starting || !guests.length} data-testid="button-start-game">{starting ? 'Starting...' : guests.length ? startLabel : 'Waiting for guests'}</button>
      </div>
    </section>}
    {!room.isHost && (isPartyBobi(avatar) ? <section className="g-card">
      <PartyBobiCard avatar={avatar}/>
    </section> : <section className="g-card">
      <p className="g-kicker">Your Bobi</p>
      <h2 className="g-title">Dress your Bobi for the party.</h2>
      <p className="g-sub">Every tap saves to the room. Everyone sees this look in the shared cup and on the podium.</p>
      <Wardrobe value={avatar} onPick={onAvatar} busy={savingAvatar} status={savingAvatar ? 'Saving to the room...' : 'Saved. Everyone sees this look.'}/>
    </section>)}
    <section className={`g-card ${room.isHost ? 'lobby-wide' : ''}`}>
      <p className="g-kicker">At the table · {guests.length} {guests.length === 1 ? 'guest' : 'guests'}</p>
      <ul className="table-list">{guests.map(p => <li key={p.id} data-testid={`player-${p.id}`}><BobiAvatar avatar={p.avatar} size={40} label/><span>{p.displayName}</span></li>)}</ul>
      {!guests.length && <p className="g-sub">Share the code. Guests join from any phone.</p>}
    </section>
    {!room.isHost && <section className="g-card lobby-wide">
      <p className="g-sub">Up to {duration} seconds per round. Daniel and Amy's moderator starts when everyone is seated.</p>
    </section>}
  </div>;
}

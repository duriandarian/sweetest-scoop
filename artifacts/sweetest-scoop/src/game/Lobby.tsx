import { Crown } from 'lucide-react';
import { BobiAvatar } from './BobiAvatar';
import { MilkTeaLobby } from './MilkTeaLobby';
import { type AvatarId, type PlayerLike, type Room } from './theme';
import { Wardrobe } from './Wardrobe';
import { ROUND_DURATION_SECONDS } from './round-countdown';

/** Back-compat name used by Home / JoinGate / Solo: the full wardrobe with live preview. */
export function AvatarPicker({ value, onPick, busy, status }: { value?: string | null; onPick: (id: AvatarId) => void; busy?: boolean; status?: string }) {
  return <Wardrobe value={value} onPick={onPick} busy={busy} status={status} compact/>;
}

export function Lobby({ room, avatar, onAvatar, savingAvatar, onStart, starting }: {
  room: Room; avatar: string; onAvatar: (id: AvatarId) => void; savingAvatar: boolean; onStart: () => void; starting: boolean;
}) {
  const players = room.players as PlayerLike[];
  const guests = players.filter(p => !p.isHost);
  const duration = ROUND_DURATION_SECONDS;
  return <div className="lobby g-arrive">
    <MilkTeaLobby players={players} isHost={!!room.isHost}/>
    <section className="g-card">
      <p className="g-kicker">Your Bobi</p>
      <h2 className="g-title">Dress your Bobi for the party.</h2>
      <p className="g-sub">Every tap saves to the room. Everyone sees this look in the shared cup and on the podium.</p>
      <Wardrobe value={avatar} onPick={onAvatar} busy={savingAvatar} status={savingAvatar ? 'Saving to the room...' : 'Saved. Everyone sees this look.'}/>
    </section>
    <section className="g-card">
      <p className="g-kicker">At the table · {guests.length} {guests.length === 1 ? 'guest' : 'guests'}</p>
      <ul className="table-list">{players.map(p => <li key={p.id} data-testid={`player-${p.id}`}><BobiAvatar avatar={p.avatar} size={40} label/><span>{p.displayName}</span>{p.isHost && <em><Crown size={12}/> moderator</em>}</li>)}</ul>
      {!guests.length && <p className="g-sub">Share the code. Guests join from any phone.</p>}
    </section>
    <section className="g-card lobby-wide">
      <p className="g-kicker">Tonight's seven</p>
      <ol className="prompt-list">{room.questions.map((q, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span>{room.isHost ? q : 'Hidden until its round'}</li>)}</ol>
      <div className="rules">
        <p><b>One answer each, locked on send.</b> Answer on your phone; your Bobi drops into the shared cup on the host screen when you lock in. Rarer answers send Bobi deeper and earn more points. Discover your own reward after your private dive, with your updated total on your phone. Your speed bonus varies with how quickly you answer, up to 20 points. Everyone's answers, the podium, and the full answer bank appear when time expires. Answers not in the bank score 0.</p>
      </div>
      {room.isHost ? <div className="host-controls">
        <p className="g-sub" data-testid="text-round-duration">{duration} seconds per question</p>
        <button className="g-btn g-btn-primary" onClick={onStart} disabled={starting || !guests.length} data-testid="button-start-game">{starting ? 'Starting...' : guests.length ? 'Start round one' : 'Waiting for guests'}</button>
      </div> : <p className="g-sub">{duration} seconds per round. Daniel and Amy's moderator starts when everyone is seated.</p>}
    </section>
  </div>;
}

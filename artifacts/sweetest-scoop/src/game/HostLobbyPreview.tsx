import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Lobby } from './Lobby';
import { hostLobbyPreviewState } from './question-preview-state';
import { GAME_TITLE } from './theme';
import { roomInviteUrl } from './room-invite';
import './question-preview.css';

/** Sample-only projector layout. No host session or room mutations. */
export function HostLobbyPreview() {
  const [guests, setGuests] = useState<1 | 40>(40);
  const [, navigate] = useLocation();
  const sample = hostLobbyPreviewState(guests);
  const sampleInvite = typeof window === 'undefined' ? undefined
    : roomInviteUrl(window.location.origin, import.meta.env.BASE_URL, sample.code, '00000000-0000-4000-8000-000000000000');
  return <div className="g-screen phase-lobby question-preview">
    <header className="g-bar">
      <span className="g-brand">{GAME_TITLE}</span>
      <Link href="/" className="g-link">Menu</Link>
    </header>
    <nav className="qp-toolbar" aria-label="Host lobby preview">
      <div className="seg" role="group" aria-label="Sample guest count">
        {([1, 40] as const).map(count => <button type="button" key={count} className={guests === count ? 'on' : undefined}
          aria-pressed={guests === count} onClick={() => setGuests(count)}>{count} {count === 1 ? 'guest' : 'guests'}</button>)}
      </div>
      <p className="qp-note"><b>Host lobby preview</b> · Sample guests and room code. No room is created.</p>
    </nav>
    <main className="g-main">
      <Lobby key={guests} room={sample} avatar="mango" onAvatar={() => {}} savingAvatar={false} starting={false} inviteUrl={sampleInvite} sampleInvite
        startLabel="View sample round" onStart={() => navigate(guests === 40 ? '/preview/question?screen=host&guests=40' : '/preview/question?screen=host')}/>
    </main>
  </div>;
}

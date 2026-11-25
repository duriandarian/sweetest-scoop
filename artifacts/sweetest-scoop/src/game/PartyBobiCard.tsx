import { BobiAvatar } from './BobiAvatar';
import { PARTY_BOBI_NAMES, type PartyBobiId } from './PartyBobiArt';

export function PartyBobiCard({ avatar }: { avatar: PartyBobiId }) {
  const amy = avatar === 'party-amy';
  return <div className="party-bobi-card" data-testid="status-party-bobi" role="status">
    <BobiAvatar avatar={avatar} size={96}/>
    <div>
      <p className="g-kicker">Party exclusive</p>
      <h2 className="g-title">{PARTY_BOBI_NAMES[avatar]}</h2>
      <p className="g-sub">{amy ? 'Bruno Mars fan with a cup of matcha and a volleyball.' : 'Chef hat on, volleyball riding shotgun.'}</p>
    </div>
  </div>;
}

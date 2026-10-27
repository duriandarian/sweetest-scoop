import { useEffect, useState } from 'react';
import type { GroupedAnswer } from '@workspace/api-client-react';
import { IngredientBadge } from './IngredientBadge';

type Ingredient = { name: string; icon: string; tier: string };
type Props = {
  round: number;
  answers: GroupedAnswer[];
  phase: 'answering' | 'revealed' | 'solo';
  selected?: Ingredient;
  onDig?: () => void;
  digs?: number;
};

export function ExcavationScene({ round, answers, phase, selected, onDig, digs = 0 }: Props) {
  const [scoop, setScoop] = useState(0);
  const [motion, setMotion] = useState<'rest' | 'press' | 'lift' | 'clear'>('rest');
  const [collected, setCollected] = useState(false);
  const reward = selected ?? (answers.length ? {
    name: answers[(Math.max(0, round - 1) + scoop) % answers.length].ingredient,
    icon: ingredientIcon(answers[(Math.max(0, round - 1) + scoop) % answers.length].ingredient),
    tier: answers[(Math.max(0, round - 1) + scoop) % answers.length].tier,
  } : { name: 'Snow cap', icon: 'snow', tier: 'Top layer' });
  const totalDigs = phase === 'solo' ? digs : scoop;
  useEffect(() => {
    setScoop(0);
    setCollected(false);
    setMotion('rest');
  }, [round, phase]);
  useEffect(() => {
    if (phase === 'solo' && digs === 0) {
      setScoop(0);
      setCollected(false);
      setMotion('rest');
    }
  }, [digs, phase]);

  const dig = () => {
    if (motion !== 'rest' || (phase === 'revealed')) return;
    setMotion('press');
    setCollected(false);
    window.setTimeout(() => {
      setMotion('lift');
      setCollected(true);
      setScoop(value => value + 1);
      onDig?.();
      window.setTimeout(() => {
        setMotion('clear');
        window.setTimeout(() => setMotion('rest'), 390);
      }, 520);
    }, 430);
  };

  return <div className="dig-area">
    <div className="game-art-wrap">
      <div className={`dig-scene depth-${Math.min(totalDigs, 5)} ${motion === 'press' ? 'is-digging' : motion === 'lift' ? 'is-lifting' : motion === 'clear' ? 'is-scooping' : ''}`} data-testid="scene-excavation">
        {Array.from({ length: Math.min(totalDigs, 6) }, (_, index) => <span className="removed-ice" key={`ice-${index}`} style={{ left: `${16 + index * 8}%`, bottom: `${12 + (index % 2) * 7}%`, transform: `scale(${0.65 + (index % 3) * 0.14}) rotate(${index * 17 - 20}deg)` }} />)}
        <div className={`mound ${totalDigs > 0 ? 'dug-1' : ''} ${totalDigs > 2 ? 'dug-2' : ''}`} aria-label="Shaved ice mound">
          {totalDigs > 0 && <span className={`cavity ${totalDigs > 0 ? 'visible' : ''}`} />}
        </div>
        <div className={`ingredient-peek ${collected || phase === 'revealed' ? 'visible' : ''}`} style={{left:`${45 + ((round + scoop) % 3) * 4}%`,top:`${38 + (totalDigs > 1 ? 4 : 0)}%`}}><IngredientBadge kind={reward.icon}/></div>
        <WoodSpoon/>
      </div>
    </div>
    <div className="spoon-control">
      {phase !== 'revealed' ? <button className="btn btn-soft" data-testid="button-dig-scoop" onClick={dig} disabled={motion !== 'rest'}>{motion === 'press' ? 'Pressing in…' : motion === 'lift' ? 'Lifting a spoonful…' : motion === 'clear' ? 'Setting it aside…' : totalDigs ? 'Dig another scoop' : 'Take the first scoop'}</button> :
        <span className="round-pill">Reward found · {reward.name}</span>}
    </div>
    <p className="dig-instruction">{totalDigs === 0 ? 'The spoon is waiting, nestled into the snowy edge.' : `${totalDigs} ${totalDigs === 1 ? 'scoop' : 'scoops'} cleared · the little hollow stays behind.`}</p>
  </div>;
}

function WoodSpoon() {
  return <div className="wood-spoon" aria-hidden="true">
    <svg viewBox="0 0 150 250" fill="none">
      <defs><linearGradient id="spoon-grain" x1="0" y1="0" x2="1" y2=".2"><stop stopColor="#a66c43"/><stop offset=".4" stopColor="#d8a16a"/><stop offset=".78" stopColor="#bd8250"/><stop offset="1" stopColor="#8d5b3e"/></linearGradient></defs>
      <path d="M72 91 126 210q8 20-6 27-13 7-22-11L49 112" fill="url(#spoon-grain)" stroke="#654938" strokeWidth="5" strokeLinejoin="round"/>
      <ellipse cx="54" cy="69" rx="33" ry="46" transform="rotate(-22 54 69)" fill="url(#spoon-grain)" stroke="#654938" strokeWidth="5"/>
      <ellipse cx="53" cy="68" rx="19" ry="29" transform="rotate(-22 53 68)" fill="#ae744b" stroke="#e8bc85" strokeWidth="2"/>
      <path d="M47 43q-10 24 3 48M74 106l40 100M64 111l40 103" stroke="#f0c48e" strokeWidth="3" strokeLinecap="round" opacity=".65"/>
      <path d="M40 79q8 9 16 2" stroke="#7d523a" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </div>;
}

function ingredientIcon(name: string) {
  const value = name.toLowerCase();
  if (value.includes('strawberry')) return 'berry';
  if (value.includes('mango')) return 'mango';
  if (value.includes('taro')) return 'taro';
  if (value.includes('bean')) return 'beans';
  if (value.includes('mochi')) return 'mochi';
  if (value.includes('grass')) return 'jelly';
  if (value.includes('lychee')) return 'lychee';
  if (value.includes('pudding')) return 'pudding';
  if (value.includes('boba') || value.includes('sugar')) return 'boba';
  return 'snow';
}

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MonitorPlay, Smartphone } from 'lucide-react';
import { OpeningCollage } from '@/components/story/OpeningCollage';
import { MenuToppings } from './MenuToppings';
import { MusicStatus } from './MusicStatus';
import { IngredientArt } from './IngredientArt';
import { PRIZES } from './theme';
import '@/components/story/story.css';
import './photo-menu.css';

const photoLabels = PRIZES.map(prize => ({
  ...prize,
  icon: <IngredientArt depth={prize.depth} size={20}/>,
}));

/** Persistent welcome menu: no autoplay, no automatic navigation. Two role choices. */
export function PhotoMenu({ onChoose }: { onChoose: (mode: 'host' | 'join') => void }) {
  const root = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <main ref={root} className="photo-menu" data-testid="photo-menu">
    <MusicStatus/>
    <OpeningCollage w={size.w} h={size.h} staticView showCup={false} photoLabels={photoLabels} decoration={<MenuToppings/>}
      greeting="Hi, I'm Bobi! Pick your look, grab a seat. Let's celebrate Daniel + Amy."
      heading={<>
        <h1 className="pm-toast">Here’s to Daniel &amp; Amy!</h1>
        <p className="oc-kicker pm-menu-label">The Daniel + Amy Menu</p>
      </>}/>
    <div className="pm-invitation"><h2>Ready to play?</h2><p>Rarer answers earn more points. Fast answers get a bonus.</p></div>
    <div className="pm-choices">
      <button type="button" className="pm-choice" onClick={() => onChoose('host')} data-testid="button-choose-create">
        <small><MonitorPlay size={12}/> Main screen</small><b>Create room <ArrowRight size={18}/></b><span>Host on the TV or laptop. Runs the questions, does not play.</span>
      </button>
      <button type="button" className="pm-choice" onClick={() => onChoose('join')} data-testid="button-choose-join">
        <small><Smartphone size={12}/> Your phone</small><b>Join room <ArrowRight size={18}/></b><span>Enter the room code and play as a guest.</span>
      </button>
    </div>
  </main>;
}

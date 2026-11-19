import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MonitorPlay, Smartphone } from 'lucide-react';
import { OpeningCollage } from '@/components/story/OpeningCollage';
import { MenuToppings } from './MenuToppings';
import { MusicStatus } from './MusicStatus';
import '@/components/story/story.css';
import './photo-menu.css';

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
    <OpeningCollage w={size.w} h={size.h} staticView showCup={false} decoration={<MenuToppings/>} greeting="Hi, I'm Bobi! Pick your look, grab a seat. Let's celebrate Daniel + Amy."/>
    <div className="pm-invitation"><h3>Your table is ready.</h3><p>Mango, sago, and a little sweet competition.</p></div>
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

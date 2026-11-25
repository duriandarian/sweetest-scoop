import { memo } from 'react';
import { Bobi } from './Bobi';
import { collage, CUP_SRC, OPENING_LINE, openingLayout } from './storyOpening';

const MENU_NAMES = ['Mirror Mango Cuddle', 'Sky-High Sago', 'Green Hill Pomelo', 'Dinner Date Duo', 'Round Mirror Swirl'];
type PhotoLabel = { name: string; base: number; color: string; ink: string; icon: React.ReactNode };

export type OpeningRefs = { root: HTMLDivElement | null; photos: (HTMLDivElement | null)[]; cup: HTMLDivElement | null; bloom: HTMLDivElement | null; bobi: HTMLDivElement | null; bubble: HTMLParagraphElement | null; title: HTMLDivElement | null };

/** hand-painted watercolor mango sago: mango on top, coconut sago and pomelo below */
export function SagoCup() {
  return <img src={CUP_SRC} className="oc-cup-img" alt="" aria-hidden="true" draggable={false} decoding="async"/>;
}

/** the personal opening: their five snapshots, Bobi out front, a mango sago cup to dive into */
export const OpeningCollage = memo(function OpeningCollage({ w, h, refs, staticView = false, greeting = OPENING_LINE, heading, decoration, showCup = true, photoLabels }: { w: number; h: number; refs?: React.MutableRefObject<OpeningRefs>; staticView?: boolean; greeting?: string; heading?: React.ReactNode; decoration?: React.ReactNode; showCup?: boolean; photoLabels?: readonly PhotoLabel[] }) {
  const L = openingLayout(w, h, staticView && !showCup);
  const r = refs?.current;
  const surfTop = L.surface.y - (L.cup.y - L.cup.h / 2);
  return <div className={`oc ${staticView ? 'is-static' : ''} ${L.mobile ? 'is-mobile' : ''}`} ref={el => { if (r) r.root = el; }} data-testid="opening-collage">
    <div className="oc-paper" aria-hidden="true"/>
    {decoration}
    <div className="oc-title" ref={el => { if (r) r.title = el; }}>
      {heading ?? <>
        <span className="oc-kicker"><b>Meet Fresh</b> · House specials, tonight only</span>
        <h2>The Daniel <i>+</i> Amy Menu</h2>
      </>}
    </div>
    {collage.map((p, i) => {
      const R = L.photos[i];
      const label = photoLabels?.[i];
      return <div key={p.src} className={`oc-photo${label ? ' has-tier' : ''}`} ref={el => { if (r) r.photos[i] = el; }} data-testid={`img-collage-${i}`}
        style={{ left: R.x - R.w / 2, top: R.y - R.h / 2, width: R.w, height: R.h,
          ['--rot' as string]: `${R.rot}deg`, ['--i' as string]: i,
          ['--photo-tier' as string]: label?.color, ['--photo-tier-ink' as string]: label?.ink }}>
        {label ? <span className="oc-tier-icon" aria-hidden="true">{label.icon}</span>
          : <span className="oc-no" aria-hidden="true">No.{i + 1}</span>}
        <img src={p.src} alt={p.alt} draggable={false} loading="eager" decoding="async"/>
        {label ? <span className="oc-dish">
          <span data-testid={`text-photo-tier-${i}`}>{label.name}</span>
          <span className="oc-tier-points" data-testid={`text-photo-points-${i}`}>{label.base} base pts</span>
        </span>
          : <span className="oc-dish" aria-hidden="true">{MENU_NAMES[i]}</span>}
      </div>;
    })}
    {showCup && <div className="oc-cup" ref={el => { if (r) r.cup = el; }} style={{ left: L.cup.x - L.cup.w / 2, top: L.cup.y - L.cup.h / 2, width: L.cup.w, height: L.cup.h, transformOrigin: `50% ${surfTop.toFixed(1)}px` }}>
      <SagoCup/>
    </div>}
    <div className="oc-bloom" aria-hidden="true" ref={el => { if (r) r.bloom = el; }} style={{ left: L.surface.x, top: L.surface.y }}/>
    <div className="oc-bobi" ref={el => { if (r) r.bobi = el; }} style={{ left: 0, top: 0, width: L.bobi.size, transform: `translate(${L.bobi.x}px, ${L.bobi.y}px)` }}>
      <div className="oc-bobi-bob"><Bobi mood="wave"/></div>
    </div>
    {L.bubble && <p className="oc-bubble" ref={el => { if (r) r.bubble = el; }} style={{ left: L.bubble.x, top: L.bubble.y, width: L.bubble.w }}>{greeting}</p>}
  </div>;
});

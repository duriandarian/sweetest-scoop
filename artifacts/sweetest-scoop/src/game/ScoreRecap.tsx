import { useEffect, useState, useSyncExternalStore } from 'react';
import { getFinalRecap, getSharedRecap, useGetFinalRecap, useGetSharedRecap } from '@workspace/api-client-react';
import type { ScoreRecap as ScoreRecapData } from '@workspace/api-client-react';
import { Clipboard, Minus, Share2 } from 'lucide-react';
import { Link } from 'wouter';
import { IngredientArt } from './IngredientArt';
import type { IngredientKind } from './IngredientArt';
import { withRequestDeadline } from './request-deadline';
import { copyScoreRecap, RECAP_TITLE, recapKey, recapToppings, scoreRecapText, scoreRecapUrl, shareScoreRecap } from './score-sharing';
import './score-recap.css';

function ToppingIcon({ kind, size }: { kind: IngredientKind | null; size: number }) {
  return <span className="recap-icon" aria-hidden="true">
    {kind ? <IngredientArt kind={kind} size={size}/> : <Minus size={Math.round(size * .65)}/>}
  </span>;
}

function RecapScore({ recap }: { recap: ScoreRecapData }) {
  const key = recapKey(recap.rounds);
  return <>
    <p className="recap-points" data-testid="recap-points"><strong>{recap.totalPoints}</strong><span>Final points</span></p>
    <ol className="recap-strip" role="list" aria-label="Round outcomes, first to last" data-testid="recap-strip">
      {recap.rounds.map((round, index) => {
        const { kind, label } = recapToppings[round];
        const description = `Round ${index + 1}: ${label}`;
        return <li key={index} title={description} className={round === 'skipped' ? 'recap-skipped' : undefined}>
          <ToppingIcon kind={kind} size={26}/><span className="sr-only">{description}</span>
        </li>;
      })}
    </ol>
    {key.length > 0 && <ul className="recap-key" role="list" aria-label="Topping key">
      {key.map(([outcome, { label, kind }]) => <li key={outcome}>
        <ToppingIcon kind={kind} size={17}/><span>{label}</span>
      </li>)}
    </ul>}
  </>;
}

export function ShareMyScore({ code, token }: { code: string; token: string }) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'manual'>('idle');
  const query = useGetFinalRecap(code, { query: {
    // Isolate seats even when a short room code is reused on the same device.
    queryKey: ['final-recap', code, token],
    queryFn: ({ signal }) => withRequestDeadline(deadline =>
      getFinalRecap(code, { headers: { 'X-Session-Token': token }, signal: deadline }), undefined, signal),
    retry: false,
    gcTime: 0,
  } });
  const result = query.isError ? undefined : query.data;
  const url = result ? scoreRecapUrl(import.meta.env.BASE_URL, window.location.origin, result.reference) : '';
  const text = result ? scoreRecapText(result.recap) : '';
  const share = async (copyOnly = false) => {
    const outcome = copyOnly ? await copyScoreRecap(navigator, text, url) : await shareScoreRecap(navigator, text, url);
    if (outcome !== 'cancelled') setFeedback(outcome === 'shared' ? 'idle' : outcome);
  };

  return <section className="g-card share-recap" aria-labelledby="share-recap-title">
    <div>
      <p className="g-kicker">Your game recap</p>
      <h2 id="share-recap-title">Share your scoop</h2>
    </div>
    {result && <>
      <RecapScore recap={result.recap}/>
      <div className="recap-actions">
        {typeof navigator.share === 'function' && <button type="button" className="g-btn g-btn-primary" onClick={() => void share()}>
          <Share2 size={16} aria-hidden="true"/> Share results
        </button>}
        <button type="button" className="g-btn g-btn-soft" onClick={() => void share(true)}>
          <Clipboard size={16} aria-hidden="true"/> Copy recap
        </button>
      </div>
      <p className="g-sub">The link expires when the room closes. Your copied recap stays readable.</p>
      <div aria-live="polite">{feedback === 'copied' && <p className="g-sub">Recap and link copied.</p>}</div>
      {feedback === 'manual' && <label className="recap-manual">
        <span role="status">Select and copy your recap and link.</span>
        <textarea className="g-input" readOnly rows={7} value={`${text}\n\n${url}`} onFocus={e => e.currentTarget.select()}/>
      </label>}
    </>}
    {query.isPending && <p className="g-sub" role="status">Preparing your recap…</p>}
    {query.isError && <div className="recap-actions">
      <p className="g-sub" role="alert">Couldn’t load your recap.</p>
      <button className="g-btn g-btn-soft" type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Try again</button>
    </div>}
  </section>;
}

const readReference = () => window.location.hash.slice(1);
function watchReference(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export function SharedScorePage() {
  const reference = useSyncExternalStore(watchReference, readReference);
  useEffect(() => {
    const title = document.title;
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobots = robots?.content;
    document.title = 'Shared score · The Sweetest Scoop';
    if (robots) robots.content = 'noindex, nofollow';
    return () => {
      document.title = title;
      if (robots && previousRobots !== undefined) robots.content = previousRobots;
    };
  }, []);
  const query = useGetSharedRecap({ query: {
    queryKey: ['shared-recap', reference],
    enabled: Boolean(reference),
    queryFn: ({ signal }) => withRequestDeadline(deadline =>
      getSharedRecap({ headers: { 'X-Result-Ref': reference }, signal: deadline }), undefined, signal),
    retry: false,
    gcTime: 0,
    refetchInterval: state => state.state.status === 'success' ? 60_000 : false,
  } });
  const status = query.error?.status;
  return <div className="g-screen">
    <main className="g-main shared-score">
      <section className="g-card recap-page" aria-labelledby="shared-score-title">
        <p className="g-kicker">Game recap</p>
        <h1 className="g-title" id="shared-score-title">{RECAP_TITLE}</h1>
        {!reference || status === 400 ? <p className="g-sub" role="status">This results link is incomplete. Check the original message for the full link.</p>
          : status === 404 ? <p className="g-sub" role="status">This results link has expired or is no longer available.</p>
          : query.isError ? <><p className="g-sub" role="alert">Couldn’t load this recap right now.</p>
            <button className="g-btn g-btn-soft" type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Try again</button></>
          : query.isPending ? <p className="g-sub" role="status">Loading results…</p>
          : <RecapScore recap={query.data}/>}
        <Link className="g-link" href="/">Back to the menu</Link>
      </section>
    </main>
  </div>;
}

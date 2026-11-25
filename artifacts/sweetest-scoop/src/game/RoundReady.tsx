import './round-ready.css';

export function RoundReady({ round, startsInMs, questionCount }: { round: number; startsInMs: number; questionCount?: number }) {
  const seconds = Math.max(1, Math.ceil(startsInMs / 1000));
  return <section className="g-card round-ready" aria-labelledby="round-ready-title" data-testid="round-ready">
    <p className="g-kicker">Round {round}{questionCount ? ` of ${questionCount}` : ''}</p>
    <h1 className="g-title" id="round-ready-title">Get ready</h1>
    <p className="round-ready-count" role="timer" aria-label={`${seconds} ${seconds === 1 ? 'second' : 'seconds'} until the question`}
      data-testid="text-round-ready-seconds">{seconds}</p>
    <p>25 seconds to answer once the question appears.</p>
  </section>;
}

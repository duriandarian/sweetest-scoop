/** Spread the crowd's refreshes without delaying the host's live answer counter. */
export function roomPollingInterval(phase?: string, host = false, jitter = 0): number | false {
  if (phase === 'finished') return false;
  const base = phase === 'answering' ? (host ? 1000 : 1500) : 2500;
  return base + Math.max(0, Math.min(400, jitter));
}

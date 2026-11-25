import { useEffect, useState } from 'react';
import type { RoomState } from '@workspace/api-client-react';

export function useLiveRoundClock(room: RoomState | undefined, receivedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  const [anchor, setAnchor] = useState<{ key: string; offset: number } | null>(null);
  const start = room?.phase === 'answering' && room.roundStartedAt ? Date.parse(room.roundStartedAt) : null;
  const end = room?.phase === 'answering' && room.roundEndsAt ? Date.parse(room.roundEndsAt) : null;
  const key = start !== null ? `${room?.code}:${room?.round}:${start}` : null;
  const sample = room?.serverNow ? receivedAt - Date.parse(room.serverNow) : NaN;
  const offset = key && anchor?.key === key
    ? (Number.isFinite(sample) ? Math.min(anchor.offset, sample) : anchor.offset)
    : (Number.isFinite(sample) ? sample : 0);
  // Receipt tends to lag the server. Keep the least-delayed sample for this
  // round so a slower poll cannot bring back Get ready or add to the clock.
  if (key && (key !== anchor?.key || offset < anchor.offset)) setAnchor({ key, offset });
  const clientStart = start === null ? null : start + offset;

  useEffect(() => {
    if (clientStart === null) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 200);
    const startDelay = clientStart - Date.now();
    const opening = startDelay > 0 ? window.setTimeout(tick, Math.ceil(startDelay)) : undefined;
    return () => { window.clearInterval(interval); window.clearTimeout(opening); };
  }, [clientStart]);

  const clientNow = Math.max(now, receivedAt);
  const startsInMs = clientStart === null ? 0 : Math.max(0, clientStart - clientNow);
  const remainingMs = end === null || startsInMs > 0 ? null : end + offset - clientNow;
  return { startsInMs, remainingMs };
}

import { MusicStatus } from './MusicStatus';

/** The shared session, not this per-round view, owns playback and transitions. */
export function RoundMusic(_props: { remainingMs: number | null }) {
  return <MusicStatus/>;
}

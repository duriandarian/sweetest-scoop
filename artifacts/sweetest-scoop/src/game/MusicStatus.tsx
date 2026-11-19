import { usePartyMusic } from './MusicProvider';
import './music.css';

/** Automatic music has no controls; only genuine playback failures need UI. */
export function MusicStatus() {
  const { state } = usePartyMusic();
  return state.error ? <p className="music-error" role="alert">{state.error}</p> : null;
}

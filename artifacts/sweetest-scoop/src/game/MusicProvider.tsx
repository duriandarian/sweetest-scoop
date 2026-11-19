import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { MusicSession, type MusicScene } from './music-session';

const Context = createContext<{
  session: MusicSession;
} | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new MusicSession(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/story/cafe-loop.mp3`));
  useEffect(() => {
    session.activate();
    session.autoplay();
    const unlock = () => session.autoplay();
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      session.dispose();
    };
  }, [session]);
  return <Context.Provider value={{ session }}>{children}</Context.Provider>;
}

export function usePartyMusic() {
  const context = useContext(Context);
  if (!context) throw new Error('Music must be inside MusicProvider.');
  const state = useSyncExternalStore(context.session.subscribe, context.session.getSnapshot, context.session.getSnapshot);
  return { ...context, state };
}

export function useMusicScene(scene: MusicScene, urgent = false) {
  const { session } = usePartyMusic();
  useEffect(() => {
    void session.setScene(scene, urgent);
    session.autoplay();
  }, [session, scene, urgent]);
  useEffect(() => () => { void session.setScene('silent'); }, [session]);
}

import { createRoundMusic, type RoundMusicEngine } from './round-music';

export type MusicScene = 'cafe' | 'round' | 'silent';
export type MusicSnapshot = {
  enabled: boolean; starting: boolean; playing: boolean;
  scene: MusicScene; volume: number; urgent: boolean; error: string;
};
type Services = {
  context: () => AudioContext;
  load: (context: AudioContext, signal: AbortSignal) => Promise<AudioBuffer>;
  round: typeof createRoundMusic;
};

/** One unlocked audio context survives navigation; phase changes only crossfade arrangements. */
export class MusicSession {
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private gain?: GainNode;
  private source?: AudioBufferSourceNode;
  private round?: RoundMusicEngine;
  private cafeTail?: ReturnType<typeof setTimeout>;
  private roundTail?: ReturnType<typeof setTimeout>;
  private abort = new AbortController();
  private listeners = new Set<() => void>();
  private epoch = 0;
  private transition = 0;
  private disposed = false;
  private state: MusicSnapshot = { enabled: false, starting: false, playing: false, scene: 'silent', volume: 25, urgent: false, error: '' };
  private services: Services;

  constructor(url: string, services?: Services) {
    this.services = services ?? {
      context: () => {
        const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Audio) throw new Error('This browser does not support music.');
        return new Audio();
      },
      load: async (context, signal) => {
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`Café music could not load (${response.status}). Tap anywhere to retry.`);
        return context.decodeAudioData(await response.arrayBuffer());
      },
      round: createRoundMusic,
    };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  activate() {
    this.disposed = false;
    if (this.abort.signal.aborted) this.abort = new AbortController();
  }
  private publish(patch: Partial<MusicSnapshot> = {}) {
    const next = { ...this.state, ...patch };
    next.playing = next.enabled && this.context?.state === 'running' && next.volume > 0
      && (next.scene === 'cafe' ? !!this.source : next.scene === 'round' ? !!this.round : false);
    this.state = next;
    this.listeners.forEach(listener => listener());
  }
  autoplay() {
    if (this.disposed || this.state.scene === 'silent' || this.state.starting || this.state.playing) return;
    try {
      const context = this.context ??= this.services.context();
      if (context.state === 'running') {
        void this.enable();
        return;
      }
      // A browser-blocked resume can remain pending until a gesture. Do not
      // mark the session as loading: the next tap must be free to retry it.
      void context.resume().then(() => {
        if (!this.disposed && this.context === context && context.state === 'running' && this.state.scene !== 'silent') {
          void this.enable();
        }
      }).catch(error => {
        if (!this.disposed && this.context === context && error?.name !== 'NotAllowedError') this.fail(error);
      });
    } catch (error) {
      this.fail(error);
    }
  }
  async enable() {
    if (this.disposed || this.state.starting || this.state.playing) return;
    const epoch = ++this.epoch;
    this.publish({ starting: true, error: '' });
    try {
      this.context ??= this.services.context();
      this.context.onstatechange = () => this.publish();
      // Called directly from a tap, before fetching, to unlock sound on phones.
      await this.context.resume();
      if (this.context.state !== 'running') throw new Error('Sound is paused by your browser. Tap anywhere to resume.');
      if (!this.gain) {
        this.gain = this.context.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(this.context.destination);
      }
      this.buffer ??= await this.services.load(this.context, this.abort.signal);
      if (this.disposed || epoch !== this.epoch) return;
      this.publish({ enabled: true, starting: false });
      await this.reconcile();
    } catch (error) {
      if (!this.disposed && epoch === this.epoch) this.fail(error);
    }
  }
  disable() {
    ++this.epoch; ++this.transition;
    this.fadeCafe(0, 0.015); this.fadeRound(0, 0.015);
    this.publish({ enabled: false, starting: false, error: '' });
  }
  async setScene(scene: MusicScene, urgent = false) {
    const changed = scene !== this.state.scene;
    if (!changed && urgent === this.state.urgent) return;
    this.round?.setUrgent(urgent);
    this.publish({ scene, urgent });
    if (changed) await this.reconcile();
  }
  setVolume(volume: number) {
    const value = Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : 25;
    this.publish({ volume: value });
    if (this.state.enabled) {
      if (this.state.scene === 'cafe') {
        if (!this.source && value > 0) void this.reconcile();
        else this.fadeCafe(value / 100);
      }
      if (this.state.scene === 'round') {
        if (!this.round && value > 0) void this.reconcile();
        else this.fadeRound(value / 100);
      }
    }
  }
  private async reconcile() {
    const transition = ++this.transition;
    if (!this.state.enabled || !this.context || !this.buffer || this.state.scene === 'silent') {
      this.fadeCafe(0); this.fadeRound(0); return;
    }
    try {
      if (this.state.scene === 'cafe') {
        this.fadeRound(0);
        if (!this.source) {
          const source = this.context.createBufferSource();
          source.buffer = this.buffer; source.loop = true;
          source.connect(this.gain!); source.start();
          this.source = source;
        }
        this.fadeCafe(this.state.volume / 100);
      } else {
        this.fadeCafe(0);
        if (!this.round) {
          const round = await this.services.round(0, this.context);
          if (this.disposed || transition !== this.transition || !this.state.enabled) { round.stop(); return; }
          this.round = round;
        }
        this.round.setUrgent(this.state.urgent);
        this.fadeRound(this.state.volume / 100);
      }
      this.publish();
    } catch (error) {
      if (!this.disposed && transition === this.transition) this.fail(error);
    }
  }
  private fadeCafe(volume: number, fadeSeconds = 0.3) {
    clearTimeout(this.cafeTail);
    if (this.gain && this.context) this.gain.gain.setTargetAtTime(volume * 0.55, this.context.currentTime, fadeSeconds);
    if (!volume && this.source) this.cafeTail = setTimeout(() => this.endCafe(), 1100);
  }
  private fadeRound(volume: number, fadeSeconds = 0.3) {
    clearTimeout(this.roundTail);
    this.round?.setVolume(volume, fadeSeconds);
    if (!volume && this.round) this.roundTail = setTimeout(() => { this.round?.stop(); this.round = undefined; this.publish(); }, 1100);
  }
  private endCafe() { this.source?.stop(); this.source?.disconnect(); this.source = undefined; this.publish(); }
  private fail(error: unknown) {
    this.disable();
    this.publish({ error: error instanceof Error ? error.message : 'Music could not start. Tap anywhere to retry.' });
  }
  dispose() {
    this.disposed = true; ++this.epoch; ++this.transition;
    this.abort.abort(); clearTimeout(this.cafeTail); clearTimeout(this.roundTail);
    this.endCafe(); this.round?.stop(); this.round = undefined;
    this.gain?.disconnect(); this.gain = undefined;
    if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); }
    this.context = undefined;
    this.publish({ enabled: false, starting: false });
  }
}

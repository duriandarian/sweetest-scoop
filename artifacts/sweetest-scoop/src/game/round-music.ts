/** Original, asset-free party-round score. No copyrighted recordings or remote audio. */
export interface RoundMusicEngine {
  setUrgent(urgent: boolean): void;
  setVolume(volume: number, fadeSeconds?: number): void;
  stop(): void;
}

export const roundTempo = (urgent: boolean) => urgent ? 160 : 128;
export const roundNote = (step: number) => {
  const roots = [52, 48, 55, 50];
  const arpeggio = [0, 7, 12, 7, 3, 7, 12, 7];
  return roots[Math.floor(step / 16) % roots.length] + arpeggio[step % 8];
};

export async function createRoundMusic(volume = 0.25, sharedContext?: AudioContext): Promise<RoundMusicEngine> {
  const AudioContextClass = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!sharedContext && !AudioContextClass) throw new Error('This browser does not support round music.');
  const context = sharedContext ?? new AudioContextClass();
  try {
    await context.resume();
    if (context.state !== 'running') throw new Error('Audio is blocked. Click Play music to try again.');
  } catch (error) {
    if (!sharedContext) void context.close();
    throw error;
  }
  const master = context.createGain();
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 6;
  master.connect(limiter).connect(context.destination);
  const setVolume = (v: number, fadeSeconds = 0.025) => master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.7, context.currentTime, Math.max(0.01, fadeSeconds));
  master.gain.value = 0;
  setVolume(volume);

  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.1), context.sampleRate);
  const data = noise.getChannelData(0);
  let seed = 719;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    data[i] = (seed >>> 0) / 2147483648 - 1;
  }
  const tone = (time: number, midi: number, length: number, gain: number, type: OscillatorType = 'triangle') => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(gain, time + 0.007);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + length);
    oscillator.connect(envelope).connect(master);
    oscillator.start(time);
    oscillator.stop(time + length + 0.015);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  };
  const kick = (time: number) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.frequency.setValueAtTime(130, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    envelope.gain.setValueAtTime(0.7, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    oscillator.connect(envelope).connect(master);
    oscillator.start(time);
    oscillator.stop(time + 0.21);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  };
  const percussion = (time: number, snare: boolean) => {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = snare ? 1400 : 7000;
    envelope.gain.setValueAtTime(snare ? 0.32 : 0.12, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + (snare ? 0.09 : 0.035));
    source.connect(filter).connect(envelope).connect(master);
    source.start(time);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  };
  let urgent = false;
  let step = 0;
  let next = context.currentTime + 0.05;
  let stopped = false;
  const schedule = () => {
    if (stopped || context.state !== 'running') return;
    // Don't queue a burst of missed beats after a suspended or throttled tab.
    next = Math.max(next, context.currentTime);
    while (next < context.currentTime + 0.15) {
      const eighth = 30 / roundTempo(urgent);
      tone(next, roundNote(step) + (urgent ? 12 : 0), eighth * 0.85, 0.15);
      if (step % 4 === 0) {
        kick(next);
        tone(next, roundNote(step - step % 16) - 12, eighth * 1.6, 0.28, 'sine');
      }
      if (step % 8 === 4) percussion(next, true);
      if (step % 2 === 1 || urgent) percussion(next, false);
      next += eighth;
      step++;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 60);
  return {
    setUrgent: value => { urgent = value; },
    setVolume,
    stop: () => {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, 0.01);
      window.setTimeout(() => {
        master.disconnect(); limiter.disconnect();
        if (!sharedContext) void context.close();
      }, 80);
    },
  };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoundMusic, roundNote, roundTempo } from './round-music';

test('original motif repeats on its bar cycle and the final countdown is faster', () => {
  assert.equal(roundTempo(false), 128);
  assert.equal(roundTempo(true), 160);
  assert.equal(roundNote(0), 52);
  assert.equal(roundNote(16), 48);
  assert.equal(roundNote(64), roundNote(0));
  assert.ok(Array.from({ length: 64 }, (_, i) => roundNote(i)).every(Number.isFinite));
});

test('music schedules audio, limits catch-up, adjusts volume, and releases resources on stop', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let closed = 0, cleared = 0, oscillators = 0;
  let poll: (() => void) | undefined;
  const values: number[] = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    cancelScheduledValues: () => {},
    setTargetAtTime: (value: number) => { values.push(value); },
  });
  const node = () => ({ connect: (target: unknown) => target, disconnect: () => {} });
  let active: FakeContext;
  class FakeContext {
    state = 'running'; currentTime = 0; sampleRate = 44100; destination = node();
    constructor() { active = this; }
    resume = async () => {};
    close = async () => { closed++; };
    createGain = () => ({ ...node(), gain: parameter() });
    createDynamicsCompressor = () => ({ ...node(), threshold: { value: 0 }, ratio: { value: 0 } });
    createBuffer = (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
    createOscillator = () => {
      oscillators++;
      return { ...node(), frequency: parameter(), start: () => {}, stop: () => {} };
    };
    createBufferSource = () => ({ ...node(), start: () => {} });
    createBiquadFilter = () => ({ ...node(), frequency: { value: 0 } });
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    AudioContext: FakeContext,
    setInterval: (fn: () => void) => { poll = fn; return 1; },
    clearInterval: () => { cleared++; },
    setTimeout: (fn: () => void) => { fn(); return 2; },
  } });
  try {
    const music = await createRoundMusic(0.25);
    assert.ok(oscillators > 0);
    music.setVolume(2);
    assert.equal(values.at(-1), 0.7);
    music.setVolume(-1);
    assert.equal(values.at(-1), 0);
    music.setUrgent(true);
    const before = oscillators;
    active!.currentTime = 100;
    poll!();
    assert.ok(oscillators - before < 10, 'a delayed tab must not burst hundreds of missed beats');
    music.stop();
    music.stop();
    assert.equal(cleared, 1);
    assert.equal(closed, 1);
    assert.equal(values.at(-1), 0);
    const shared = new FakeContext();
    const sharedMusic = await createRoundMusic(0.25, shared as unknown as AudioContext);
    sharedMusic.stop();
    assert.equal(closed, 1, 'stopping a round must not close the menu session audio context');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('unsupported audio fails explicitly rather than claiming playback started', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  try { await assert.rejects(createRoundMusic(), /does not support/); }
  finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

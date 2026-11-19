import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MusicSession } from './music-session';
import type { RoundMusicEngine } from './round-music';

function fixture(load?: () => Promise<AudioBuffer>, makeRound?: () => Promise<RoundMusicEngine>) {
  const events = { starts: 0, stops: 0, closes: 0, loads: 0, rounds: 0, roundStops: 0, urgent: false, roundVolume: 0, cafeGains: [] as number[] };
  const round: RoundMusicEngine = {
    setUrgent: value => { events.urgent = value; },
    setVolume: value => { events.roundVolume = value; },
    stop: () => { events.roundStops++; },
  };
  const context = {
    state: 'running', currentTime: 0, destination: {}, onstatechange: null,
    resume: async () => {},
    close: async () => { events.closes++; },
    createGain: () => ({ gain: { value: 0, setTargetAtTime: (value: number) => events.cafeGains.push(value) }, connect: () => {}, disconnect: () => {} }),
    createBufferSource: () => ({
      connect: () => {}, disconnect: () => {},
      start: () => { events.starts++; }, stop: () => { events.stops++; },
    }),
  } as unknown as AudioContext;
  const session = new MusicSession('/test.mp3', {
    context: () => context,
    load: async () => { events.loads++; return load ? load() : {} as AudioBuffer; },
    round: async (_volume, shared) => {
      assert.equal(shared, context, 'the party beat must reuse the unlocked café context');
      events.rounds++;
      return makeRound ? makeRound() : round;
    },
  });
  return { session, events, round, context };
}

test('autoplay starts the cafe without a music button and never duplicates playback', async () => {
  const { session, events } = fixture();
  try {
    await session.setScene('cafe');
    session.autoplay();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(session.getSnapshot().playing, true);
    session.autoplay();
    assert.equal(events.starts, 1);
  } finally { session.dispose(); }
});

test('blocked autoplay stays retryable until a gesture resumes the context', async () => {
  const { session, events, context } = fixture();
  let resumes = 0;
  Object.assign(context, {
    state: 'suspended',
    resume: () => {
      if (++resumes === 1) return new Promise<void>(() => {});
      Object.assign(context, { state: 'running' });
      return Promise.resolve();
    },
  });
  try {
    await session.setScene('cafe');
    session.autoplay();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(session.getSnapshot().starting, false);
    assert.equal(session.getSnapshot().playing, false);
    assert.equal(session.getSnapshot().error, '');
    session.autoplay();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(session.getSnapshot().playing, true);
    assert.equal(events.starts, 1);
  } finally { session.dispose(); }
});

test('a pending autoplay cannot restart sound after the session is disposed', async () => {
  const { session, events, context } = fixture();
  let resume!: () => void;
  Object.assign(context, { state: 'suspended', resume: () => new Promise<void>(resolve => { resume = resolve; }) });
  await session.setScene('cafe');
  session.autoplay();
  session.dispose();
  Object.assign(context, { state: 'running' });
  resume();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(events.starts, 0);
  assert.equal(session.getSnapshot().enabled, false);
});

test('cafe crossfades to the round, speeds up, and returns without duplicating audio', async () => {
  const { session, events } = fixture();
  try {
    await session.setScene('cafe');
    await session.enable();
    assert.equal(session.getSnapshot().playing, true);
    assert.equal(events.starts, 1);
    await session.setScene('round');
    assert.equal(events.rounds, 1);
    assert.equal(events.cafeGains.at(-1), 0);
    assert.equal(events.roundVolume, 0.25);
    await session.setScene('round', true);
    assert.equal(events.urgent, true);
    session.setVolume(75);
    assert.equal(events.roundVolume, 0.75);
    await session.setScene('cafe');
    assert.equal(events.starts, 1, 'a quick crossfade reuses the still-running café loop');
    assert.equal(events.roundVolume, 0);
    assert.equal(events.loads, 1);
    assert.equal(events.closes, 0);
  } finally { session.dispose(); }
  assert.equal(events.closes, 1);
  assert.equal(events.stops, 1);
  assert.equal(events.roundStops, 1);
});

test('entering a guest screen silences playback; mute stays off across phase changes', async () => {
  const { session, events } = fixture();
  try {
    await session.setScene('cafe'); await session.enable();
    await session.setScene('silent');
    assert.equal(session.getSnapshot().playing, false);
    assert.equal(events.cafeGains.at(-1), 0);
    session.disable();
    await session.setScene('round', true);
    assert.equal(session.getSnapshot().enabled, false);
    assert.equal(events.rounds, 0);
  } finally { session.dispose(); }
});

test('muting while the soundtrack loads prevents late playback', async () => {
  let resolve!: (buffer: AudioBuffer) => void;
  const buffer = new Promise<AudioBuffer>(done => { resolve = done; });
  const { session, events } = fixture(() => buffer);
  try {
    await session.setScene('cafe');
    const starting = session.enable();
    await Promise.resolve();
    session.disable();
    resolve({} as AudioBuffer);
    await starting;
    assert.equal(session.getSnapshot().playing, false);
    assert.equal(session.getSnapshot().starting, false);
    assert.equal(events.starts, 0);
  } finally { session.dispose(); }
});

test('loading failures are explicit and a later tap can retry', async () => {
  let fail = true;
  const { session, events } = fixture(async () => {
    if (fail) throw new Error('Track download failed');
    return {} as AudioBuffer;
  });
  try {
    await session.setScene('cafe'); await session.enable();
    assert.match(session.getSnapshot().error, /download failed/);
    assert.equal(session.getSnapshot().playing, false);
    fail = false;
    await session.enable();
    assert.equal(session.getSnapshot().playing, true);
    assert.equal(events.loads, 2);
  } finally { session.dispose(); }
});

test('raising volume from zero restarts a released cafe source', async () => {
  const { session, events } = fixture();
  try {
    await session.setScene('cafe'); await session.enable();
    session.setVolume(0);
    await new Promise(resolve => setTimeout(resolve, 1150));
    assert.equal(events.stops, 1);
    session.setVolume(30);
    assert.equal(events.starts, 2);
    assert.equal(session.getSnapshot().playing, true);
    assert.equal(events.loads, 1);
  } finally { session.dispose(); }
});

test('a stale round start is disposed if the screen changes during creation', async () => {
  let resolve!: (engine: RoundMusicEngine) => void;
  const pending = new Promise<RoundMusicEngine>(done => { resolve = done; });
  const { session, events, round } = fixture(undefined, () => pending);
  await session.setScene('cafe'); await session.enable();
  const changing = session.setScene('round');
  session.dispose();
  resolve(round); await changing;
  assert.equal(events.roundStops, 1);
  assert.equal(events.closes, 1);
  assert.equal(session.getSnapshot().playing, false);
});

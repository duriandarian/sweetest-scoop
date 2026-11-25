import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countdownSeconds, PRACTICE_PROMPT_DELAY_MS, PRACTICE_ROUND_MS, remainingPracticeMs, remainingRoundMs } from './round-countdown';

test('practice countdown follows elapsed wall-clock time and never goes negative', () => {
  const start = 100_000;
  const deadline = start + PRACTICE_ROUND_MS;
  assert.equal(PRACTICE_ROUND_MS, 25_000);
  assert.equal(remainingRoundMs(deadline, start), 25_000);
  assert.equal(remainingRoundMs(deadline, start + 12_500), 12_500);
  assert.equal(remainingRoundMs(deadline, deadline - 1), 1);
  assert.equal(remainingRoundMs(deadline, deadline), 0);
  assert.equal(remainingRoundMs(deadline, deadline + 100_000), 0);
  // Restart/next question gets a fresh deadline, rather than an expired interval counter.
  assert.equal(remainingRoundMs(deadline + 100_000 + PRACTICE_ROUND_MS, deadline + 100_000), 25_000);
});

test('answer timer shows 25 seconds, rounds up, and can display legacy in-progress rounds', () => {
  assert.equal(countdownSeconds(null), null);
  assert.equal(countdownSeconds(25_000), 25);
  assert.equal(countdownSeconds(90_000), 90);
  assert.equal(countdownSeconds(60_000), 60);
  assert.equal(countdownSeconds(30_000), 30);
  assert.equal(countdownSeconds(10_001), 11);
  assert.equal(countdownSeconds(10_000), 10);
  assert.equal(countdownSeconds(1), 1);
  assert.equal(countdownSeconds(0), 0);
  assert.equal(countdownSeconds(-500), 0);
});

test('practice gives a one-second prompt delay followed by an automatic countdown without typing', () => {
  const appeared = 600_000;
  const deadline = appeared + PRACTICE_PROMPT_DELAY_MS + PRACTICE_ROUND_MS;
  assert.equal(PRACTICE_PROMPT_DELAY_MS, 1000);
  assert.equal(remainingPracticeMs(deadline, appeared), 25_000);
  assert.equal(remainingPracticeMs(deadline, appeared + 999), 25_000);
  assert.equal(remainingPracticeMs(deadline, appeared + 1000), 25_000);
  assert.equal(remainingPracticeMs(deadline, appeared + 2000), 24_000);
  assert.equal(remainingPracticeMs(deadline, appeared + 26_000), 0);
});

test('started practice expires after 25 seconds and restarting returns to ready', () => {
  const start = 600_000;
  const deadline = start + PRACTICE_ROUND_MS;
  assert.equal(remainingPracticeMs(deadline, start), 25_000);
  assert.equal(remainingPracticeMs(deadline, start + 10_000), 15_000);
  assert.equal(remainingPracticeMs(deadline, deadline), 0);
  assert.equal(remainingPracticeMs(deadline, deadline + 10_000), 0);
  assert.equal(remainingPracticeMs(null, deadline + 10_000), 25_000);
});

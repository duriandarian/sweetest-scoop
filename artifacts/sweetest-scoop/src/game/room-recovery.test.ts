import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RoomState } from '@workspace/api-client-react';
import { reconcileRoom, sessionRejected } from './room-recovery';

const snapshot = (changes: Partial<RoomState> = {}) => ({
  code: 'RECOVR', playerId: 'guest', round: 1, phase: 'answering',
  serverNow: '2026-11-19T12:00:01Z', submitted: false,
  myAnswer: null, myReward: null, myTotalPoints: 0, ...changes,
} as RoomState);

test('a delayed poll cannot erase an accepted canonical answer or reward', () => {
  const locked = snapshot({ submitted: true, myAnswer: 'Bruno Mars', myTotalPoints: 37 });
  assert.equal(reconcileRoom(locked, snapshot()), locked);
  assert.equal(reconcileRoom(locked, snapshot({ serverNow: '2026-11-19T12:00:02Z' })), locked);
});

test('delayed submission responses cannot restore an earlier round or phase', () => {
  const next = snapshot({ round: 2, myTotalPoints: 37 });
  const late = snapshot({ submitted: true, myAnswer: 'Bruno Mars', myTotalPoints: 37,
    serverNow: '2026-11-19T12:00:03Z' });
  assert.equal(reconcileRoom(next, late), next);
  const revealed = snapshot({ phase: 'revealed' });
  assert.equal(reconcileRoom(revealed, late), revealed);
  assert.equal(reconcileRoom(late, next), next);
});

test('stale snapshots are ignored, fresh snapshots and different seats are allowed', () => {
  const fresh = snapshot({ serverNow: '2026-11-19T12:00:02Z' });
  assert.equal(reconcileRoom(fresh, snapshot()), fresh);
  assert.equal(reconcileRoom(snapshot(), fresh), fresh);
  const other = snapshot({ playerId: 'other' });
  assert.equal(reconcileRoom(fresh, other), other);
});

test('only an explicit authentication rejection expires a saved seat', () => {
  assert.equal(sessionRejected(new TypeError('Failed to fetch')), false);
  assert.equal(sessionRejected({ status: 503 }), false);
  assert.equal(sessionRejected(null), false);
  assert.equal(sessionRejected({ status: 401 }), true);
});

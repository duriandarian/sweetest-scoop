import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PREVIEW_QUESTIONS, questionPreviewState } from './question-preview-state';
import { PRIZES } from './theme';

test('all seven question previews use the real question components contract without a real room', () => {
  assert.equal(PREVIEW_QUESTIONS.length, 7);
  for (let index = 0; index < PREVIEW_QUESTIONS.length; index++) {
    const room = questionPreviewState({ index, host: false, answer: null, tier: 2, avatar: 'b1:0:2:1:1' });
    assert.equal(room.currentQuestion, PREVIEW_QUESTIONS[index]);
    assert.equal(room.round, index + 1);
    assert.equal(room.roundDuration, 25);
    assert.equal(room.code, 'PREVIEW');
    assert.equal(room.myAnswer, null);
    assert.equal(room.myReward, null);
    assert.equal(room.myTotalPoints, 0);
    assert.equal(room.submittedCount, 0);
    assert.deepEqual(room.possibleAnswers, []);
  }
});

test('preview reward follows the explicit selector, never the entered answer or speed', () => {
  for (const p of PRIZES) {
    const a = questionPreviewState({ index: 0, host: false, answer: 'An unscored example', tier: p.depth, avatar: 'mango' });
    const b = questionPreviewState({ index: 0, host: false, answer: 'Another unscored example', tier: p.depth, avatar: 'mango' });
    assert.deepEqual(a.myReward, b.myReward);
    assert.equal(a.myReward?.points, p.base);
    assert.equal(a.myReward?.speedBonus, 0);
    assert.equal(a.myReward?.depth, p.depth);
  }
});

test('host preview sees illustrative submission status without private answer content', () => {
  const room = questionPreviewState({ index: 1, host: true, answer: 'Private example', tier: 4, avatar: 'b1:0:9:7:8' });
  assert.equal(room.myAnswer, null);
  assert.equal(room.myReward, null);
  assert.equal(room.myTotalPoints, 0);
  assert.equal(room.players.filter(p => p.hasAnswered).length, 1);
  assert.equal(room.submittedCount, 1);
  assert.deepEqual(room.answers, []);
  assert.deepEqual(room.roundStandings, []);
});

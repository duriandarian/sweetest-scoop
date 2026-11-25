import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PREVIEW_QUESTIONS, questionPreviewState } from './question-preview-state';

test('all eight question previews match the latest prompts without exposing the bank', () => {
  assert.equal(PREVIEW_QUESTIONS.length, 8);
  assert.equal(PREVIEW_QUESTIONS[4], 'Name an item Amy carries on her');
  assert.equal(PREVIEW_QUESTIONS[5], 'Name a boba place Daniel has tried');
  assert.match(PREVIEW_QUESTIONS[7], /Daniel loves about Amy/);
  for (let index = 0; index < PREVIEW_QUESTIONS.length; index++) {
    const room = questionPreviewState({ index, host: false, answer: null, avatar: 'b1:0:2:1:1' });
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

const checkedReward = { elapsedMs: 25000, matched: true, basePoints: 60, points: 60, speedBonus: 0,
  tier: 'Pomelo Gem', ingredient: 'Pomelo Gem', depth: 2 };
test('preview does not invent a reward from entered text', () => {
  const pending = questionPreviewState({ index: 0, host: false, answer: 'Not checked yet', avatar: 'mango' });
  assert.equal(pending.myReward, null);
  assert.equal(pending.submitted, false);
  const accepted = questionPreviewState({ index: 0, host: false, answer: 'Checked answer', reward: checkedReward, avatar: 'mango' });
  assert.deepEqual(accepted.myReward, checkedReward);
});

test('host preview sees illustrative submission status without private answer content', () => {
  const room = questionPreviewState({ index: 1, host: true, answer: 'Private example', reward: checkedReward, avatar: 'b1:0:9:7:8' });
  assert.equal(room.myAnswer, null);
  assert.equal(room.myReward, null);
  assert.equal(room.myTotalPoints, 0);
  assert.equal(room.players.filter(p => p.hasAnswered).length, 1);
  assert.equal(room.submittedCount, 1);
  assert.deepEqual(room.answers, []);
  assert.deepEqual(room.roundStandings, []);
});

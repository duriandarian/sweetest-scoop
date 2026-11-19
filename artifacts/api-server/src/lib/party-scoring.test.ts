import { test } from "node:test";
import assert from "node:assert/strict";
import { matchKey, normalizeAnswer, questionBank, scoreAnswer, TIERS, ROUND_DURATION_SECONDS } from "./party-scoring";

test("seven complete prepared question banks with all five dessert tiers", () => {
  assert.equal(questionBank.length, 7);
  assert.ok(questionBank[2].catalog.length > 1200);
  assert.deepEqual(new Set(questionBank.flatMap(q => q.catalog.map(a => a.tier))), new Set(TIERS));
});
test("normalization accepts case, whitespace, punctuation and accents", () => {
  assert.equal(normalizeAnswer("  Bruno   MARS "), "bruno mars");
  assert.equal(matchKey(" ROSÉ "), matchKey("rose"));
  assert.equal(scoreAnswer(0, "Bruno   MARS", 0, 60000).basePoints, 20);
  assert.equal(scoreAnswer(0, "a made up artist", 0, 60000).points, 0);
});
test("a clear minor typo earns the same rarity and server-timed speed points", () => {
  assert.deepEqual(scoreAnswer(0, "Bruno Mras", 7500, 25000), scoreAnswer(0, "Bruno Mars", 7500, 25000));
  assert.equal(scoreAnswer(0, "Bruno", 7500, 25000).matched, false);
});
test("rarity comes from sheet, independent of other submissions and speed", () => {
  const reward = scoreAnswer(0, "Sovereign Grace Music", 30000, 60000);
  assert.equal(reward.basePoints, 100);
  assert.equal(reward.speedBonus, 10);
  assert.equal(reward.points, 110);
  assert.equal(reward.depth, 4);
  assert.equal(reward.ingredient, "Golden Mango");
  assert.equal(scoreAnswer(0, "Sovereign Grace Music", 59000, 60000).depth, 4);
});
test("Too Clever earns lowest tier base points", () => {
  assert.equal(scoreAnswer(1, "Google cafe", 30000, 60000).basePoints, 20);
  assert.equal(scoreAnswer(5, "mango sago", 30000, 60000).tier, "Sago Pearl");
});
test("speed bonus respects endpoints and server duration; unknown answers get no bonus", () => {
  assert.equal(scoreAnswer(0, "Bruno Mars", 0, 60000).points, 40);
  assert.equal(scoreAnswer(0, "Bruno Mars", 60000, 60000).points, 20);
  assert.equal(scoreAnswer(0, "Bruno Mars", 15000, 30000).speedBonus, 10);
  assert.equal(scoreAnswer(0, "unlisted artist", 0, 60000).speedBonus, 0);
  assert.equal(scoreAnswer(0, "Bruno Mars", -100, 60000).speedBonus, 20);
});
test("25-second rounds retain a variable 20-point speed maximum independent of rarity", () => {
  assert.equal(ROUND_DURATION_SECONDS, 25);
  const duration = ROUND_DURATION_SECONDS * 1000;
  for (const answer of ["Bruno Mars", "Sovereign Grace Music"]) {
    assert.equal(scoreAnswer(0, answer, 0, duration).speedBonus, 20);
    assert.equal(scoreAnswer(0, answer, 12_500, duration).speedBonus, 10);
    assert.equal(scoreAnswer(0, answer, 24_000, duration).speedBonus, 1);
    assert.equal(scoreAnswer(0, answer, 25_000, duration).speedBonus, 0);
  }
  assert.equal(scoreAnswer(0, "unlisted artist", 0, duration).points, 0);
});
test("every catalog answer scores its listed base and depth consistently", () => {
  for (const [position, question] of questionBank.entries()) for (const entry of question.catalog) {
    const result = scoreAnswer(position, entry.answer, 60000, 60000);
    assert.equal(result.basePoints, entry.basePoints);
    assert.equal(result.depth, entry.depth);
    assert.equal(result.tier, entry.tier);
  }
});

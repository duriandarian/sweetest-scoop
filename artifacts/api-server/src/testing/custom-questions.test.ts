import assert from "node:assert/strict";
import { test } from "node:test";
import { CUSTOM_LIMITS, CUSTOM_TEMPLATE, parseCustomQuestions } from "@workspace/scoop-rules";
import { correctionForRound, customRoundBank, scoreRound } from "../lib/party-scoring";

test("the spreadsheet template parses in order and sheets can omit repeated prompts", () => {
  const result = parseCustomQuestions(CUSTOM_TEMPLATE);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.questions.map(q => [q.prompt, q.answers.length]), [["Name a fruit", 2], ["Name a board game", 1]]);
  assert.deepEqual(parseCustomQuestions("\uFEFF" + CUSTOM_TEMPLATE.replace(/\n/g, "\r\n")), result);
  assert.deepEqual(parseCustomQuestions(CUSTOM_TEMPLATE.split("\n").slice(1).join("\n")), result);
});

test("quoted columns, punctuation, casing and Unicode round trip", () => {
  const { questions, issues } = parseCustomQuestions('Question\tAnswer\tDessert tier\n"Name a fruit\nfrom Taiwan"\t"Wax ""Apple"""\t sago pearl \n\t\u{1F34F} 蓮霧\tmango CUBE');
  assert.deepEqual(issues, []);
  assert.deepEqual(questions, [{ prompt: "Name a fruit from Taiwan", answers: [
    { answer: 'Wax "Apple"', depth: 0 }, { answer: "\u{1F34F} 蓮霧", depth: 1 },
  ] }]);
});

test("flags each bad row and preserves the first spelling for equal-tier duplicates", () => {
  const { questions, issues } = parseCustomQuestions([
    "Question\tAnswer\tDessert tier", "\tLemon\tSago Pearl", "Fruit\t\tUnknown", "Fruit\tCitron vert\tMango Cube",
    "\tCitron vert\tMango Cube", "\tCITRON-VERT!\tGolden Mango", "Bad format\t  ",
    'Fresh!\t"not closed',
  ].join("\n"));
  assert.deepEqual(questions, [{ prompt: "Fruit", answers: [{ answer: "Citron vert", depth: 1 }] }]);
  assert.deepEqual(issues.map(i => i.row).sort(), [2, 3, 3, 6, 7, 8]);
  assert.match(issues.find(i => i.row === 6)!.message, /already appears in row 4/);
});

test("requires real questions and answers within the same server and browser limits", () => {
  assert.ok(parseCustomQuestions("Question\tAnswer\tDessert tier").issues.length);
  assert.ok(parseCustomQuestions("Fruit\t!!!\tSago Pearl").issues.length);
  assert.ok(parseCustomQuestions("Fruit\tPear\t").issues.length);
  assert.ok(parseCustomQuestions("x".repeat(CUSTOM_LIMITS.text + 1)).issues.length);
  for (const [count, rows, error] of [
    [CUSTOM_LIMITS.rounds + 1, (i: number) => `Question ${i}\tFruit\tMango Cube`, /10 questions/],
    [CUSTOM_LIMITS.answersPerRound + 1, (i: number) => `Fruit\tOption ${i}\tMango Cube`, /60 answers/],
    [CUSTOM_LIMITS.rows + 1, (i: number) => `Question ${Math.floor(i / 50)}\tFruit ${i}\tMango Cube`, /300 answer rows/],
  ] as const) {
    assert.ok(parseCustomQuestions(Array.from({ length: count }, (_, i) => rows(i)).join("\n")).issues.some(i => error.test(i.message)));
  }
});

test("custom scoring keeps authored labels and uses existing matching and speed points", () => {
  const [{ prompt, answers }] = parseCustomQuestions(CUSTOM_TEMPLATE).questions;
  const bank = customRoundBank(prompt, answers);
  assert.equal(correctionForRound(bank, "APPLE"), undefined);
  assert.deepEqual(correctionForRound(bank, "Dragno fruit"), { originalAnswer: "Dragno fruit", correctedAnswer: "Dragon fruit" });
  assert.deepEqual(scoreRound(bank, "DRAGON FRUIT", 5000, 25000), {
    canonicalAnswer: "Dragon fruit", points: 116, basePoints: 100, speedBonus: 16,
    tier: "Golden Mango", ingredient: "Golden Mango", depth: 4, matched: true, elapsedMs: 5000,
  });
});

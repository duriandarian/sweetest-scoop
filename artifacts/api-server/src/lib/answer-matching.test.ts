import { test } from "node:test";
import assert from "node:assert/strict";
import { findUniqueAnswer } from "./answer-matching";

const answers = new Map([["brunomars", "Bruno Mars"], ["mangosago", "Mango sago"]]);
test("forgives a single missing, extra, wrong or transposed letter", () => {
  for (const typo of ["brunomrs", "brunoomars", "brunomarz", "brunomras"]) {
    assert.equal(findUniqueAnswer(typo, answers), "Bruno Mars", typo);
  }
});
test("exact answers beat neighbors, even for very short words", () => {
  const neighbors = new Map([["mango", 20], ["mangoo", 100], ["amy", 60]]);
  assert.equal(findUniqueAnswer("mango", neighbors), 20);
  assert.equal(findUniqueAnswer("amy", neighbors), 60);
});
test("ambiguous typos never choose an answer or favor a rarer tier", () => {
  const ambiguous = new Map([["mango", 20], ["mange", 100]]);
  assert.equal(findUniqueAnswer("mangi", ambiguous), undefined);
  assert.equal(findUniqueAnswer("mangi", new Map([...ambiguous].reverse())), undefined);
});
test("short, partial, empty and substantially different answers are not guessed", () => {
  for (const typo of ["", "bru", "bruno", "brunomzzs", "thisisnotananswer"]) {
    assert.equal(findUniqueAnswer(typo, answers), undefined, typo);
  }
  assert.equal(findUniqueAnswer("amyy", new Map([["amy", "Amy"]])), undefined);
});
test("a transposition plus another typo is not a single edit", () => {
  assert.equal(findUniqueAnswer("brunomraz", answers), undefined);
});

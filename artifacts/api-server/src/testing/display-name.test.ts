import assert from "node:assert/strict";
import { test } from "node:test";
import { displayNameKey, validateDisplayName } from "../lib/display-name";

test("display names retain casing, accents and non-Latin characters", () => {
  for (const [input, name] of [
    ["  Amy   Chang ", "Amy Chang"],
    ["E\u0301lodie", "Élodie"],
    ["陳小明", "陳小明"],
    ["👩‍🍳", "👩‍🍳"],
    ["O’Malley", "O’Malley"],
    ["a".repeat(32), "a".repeat(32)],
  ]) assert.deepEqual(validateDisplayName(input), { name });
});

test("empty, oversized, invisible-only and control-character names are rejected", () => {
  for (const input of [null, 123, "", "   ", "a".repeat(33), "\u200b", "!!!", "A\u0000B", "A\u202eB", "<name>"])
    assert.ok("error" in validateDisplayName(input), JSON.stringify(input));
});

test("name comparison normalizes case, spacing and equivalent Unicode forms", () => {
  assert.equal(displayNameKey(" Ａmy　 CHANG "), displayNameKey("amy chang"));
  assert.equal(displayNameKey("A\u200bmy"), displayNameKey("Amy"));
  assert.equal(displayNameKey("Élodie"), displayNameKey("E\u0301LODIE"));
  assert.notEqual(displayNameKey("Élodie"), displayNameKey("Elodie"));
});

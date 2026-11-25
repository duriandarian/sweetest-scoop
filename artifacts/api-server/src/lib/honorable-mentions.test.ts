import assert from "node:assert/strict";
import { test } from "node:test";
import { honorableMentions } from "./honorable-mentions";

const guests = [
  { id: "a", displayName: "Mango fan" },
  { id: "b", displayName: "Sago scout" },
  { id: "c", displayName: "Pomelo pal", avatar: "b1:1:4:2:2" },
];
const answer = (playerId: string, basePoints: number, elapsedMs: number | null, round: number) =>
  ({ playerId, basePoints, elapsedMs, createdAt: new Date(round * 30_000 + (elapsedMs ?? 0)) });

test("awards use valid replies across rounds and count rare finds, not speed bonuses", () => {
  const awards = honorableMentions(guests, [
    answer("a", 20, 600, 1), answer("a", 100, 1000, 7),
    answer("b", 40, 24_918, 2), answer("c", 80, 1800, 3),
    answer("c", 80, 2500, 4), answer("c", 60, 1400, 7),
    answer("b", 0, 10, 1), answer("b", 0, 25_000, 4),
    answer("moderator", 100, 20, 1), answer("moderator", 100, 25_000, 2),
  ]);
  assert.deepEqual(awards.map(a => [a.category, a.playerId, a.value]), [
    ["fastest", "a", 600], ["just-in-time", "b", 24_918], ["rare-finds", "c", 2],
  ]);
  assert.equal(awards[2].avatar, guests[2].avatar);
});

test("ineligible categories are omitted rather than assigned to players without a qualifying answer", () => {
  assert.deepEqual(honorableMentions(guests, [answer("a", 0, 20, 1)]), []);
  assert.deepEqual(honorableMentions(guests, [answer("b", 60, 0, 1), answer("a", 20, null, 2)])
    .map(a => [a.category, a.playerId]), [["fastest", "b"], ["just-in-time", "b"]]);
});

test("equal times are decided consistently by earlier acceptance; rare-count ties favor higher rarity", () => {
  const entries = [answer("b", 80, 900, 1), answer("a", 100, 900, 3)];
  const result = honorableMentions(guests, entries);
  assert.deepEqual(result.map(a => a.playerId), ["b", "b", "a"]);
  assert.deepEqual(honorableMentions(guests, [...entries].reverse()), result);
});

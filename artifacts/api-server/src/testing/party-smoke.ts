/** Run against the managed development API: pnpm --filter @workspace/api-server exec tsx src/testing/party-smoke.ts
 * Creates its own room, exercises the full game, and removes only that room afterwards.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { and, eq } from "drizzle-orm";
import { db, pool, scoopAnswersTable, scoopPlayersTable, scoopRoomsTable } from "@workspace/db";
import { questionBank, ROUND_COUNT } from "../lib/party-scoring";
import { hashSessionToken } from "../lib/room-session";

const base = "http://localhost:80/api";
const cookingTypo = "Garilc parmasan steak patsa";
const longerCookingTypo = "Garilc parmasan stek patsa";
const cookingAnswer = "Garlic Parmesan Steak Pasta";
const missingWordAnswer = "parmesan steak pasta";
const cookingRound = questionBank.findIndex(q => q.prompt === "Name something we've cooked together") + 1;
const itemRound = questionBank.findIndex(q => q.prompt === "Name an item Amy carries on her") + 1;
const activityRound = questionBank.findIndex(q => q.prompt === "Name a date activity that Daniel & Amy have done") + 1;
const activityClues = [
  { typo: "kardashians", canonical: "Watch the Kardashians", points: 74 },
  { typo: "watch kardashians", canonical: "Watch the Kardashians", points: 74 },
  { typo: "volleyball", canonical: "Watch Volleyball Clips", points: 74 },
  { typo: "lego", canonical: "Build LEGO Sculptures", points: 94 },
  { typo: "movies", canonical: "Watch Movies", points: 34 },
];
const confirmationClues = [
  { round: 1, typo: "Vineyard", canonical: "Vineyard Music", points: 74 },
  { round: 2, typo: "zhangliang", canonical: "Zhangliang Malatang", points: 34 },
  { round: 2, typo: "malatang", canonical: "Zhangliang Malatang", points: 34 },
  { round: 2, typo: "cali spartan", canonical: "Cali Spartan Tacos", points: 74 },
  { round: 2, typo: "Cuanyue", canonical: "Cuanyue Malatang", points: 74 },
  { round: 2, typo: "SGD Tofu", canonical: "SGD Tofu House", points: 74 },
  { round: 2, typo: "Taichi", canonical: "Taichi Pot Shabu Shabu", points: 94 },
  { round: 2, typo: "Daeho", canonical: "Daeho Kalbijjim", points: 74 },
  { round: 2, typo: "yummy tofu", canonical: "Yummy Tofu & BBQ", points: 94 },
  { round: 2, typo: "Seasons noodles", canonical: "Seasons Noodle & Dumpling Garden", points: 94 },
  { round: itemRound, typo: "books", canonical: "Book", points: 54 },
  { round: itemRound, typo: "rings", canonical: "Ring", points: 54 },
];
let roomId: string | undefined;
async function call(path: string, method = "GET", token?: string, body?: unknown) {
  const r = await fetch(`${base}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(token ? { "X-Session-Token": token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  // This harness intentionally exercises successful and error envelopes; assertions below
  // validate their runtime shape rather than pretending every response is a RoomState.
  const data: any = await r.json();
  return { status: r.status, data };
}
try {
  // Practice uses the same prepared bank, not the former selectable example prize.
  for (let position = 0; position < questionBank.length; position++) {
    for (const depth of [0, 1, 2, 3, 4]) {
      const candidate = questionBank[position].catalog.find(entry => entry.depth === depth);
      if (!candidate) continue;
      const checked = await call("/practice/answer", "POST", undefined,
        { round: position + 1, answer: candidate.answer, elapsedMs: 10000 });
      assert.equal(checked.status, 200);
      assert.equal(checked.data.matched, true);
      assert.equal(checked.data.ingredient, candidate.tier);
      assert.equal(checked.data.depth, depth);
      assert.equal(checked.data.basePoints, candidate.basePoints);
      assert.equal(checked.data.speedBonus, 12);
      assert.equal(checked.data.points, candidate.basePoints + 12);
      assert.ok(!("possibleAnswers" in checked.data));
    }
    const notListed = await call("/practice/answer", "POST", undefined,
      { round: position + 1, answer: "unlisted smoke answer", elapsedMs: 1000 });
    assert.equal(notListed.status, 200);
    assert.equal(notListed.data.matched, false);
    assert.equal(notListed.data.points, 0);
    assert.ok(!("error" in notListed.data));
  }
  for (const { round, typo, canonical, points } of [
    { round: 1, typo: "Bruno Mras", canonical: "Bruno Mars", points: 34 },
    { round: 1, typo: "Sovereing Grase Music", canonical: "Sovereign Grace Music", points: 114 },
    { round: 1, typo: "sovreign grace", canonical: "Sovereign Grace Music", points: 114 },
    { round: 2, typo: "waymo", canonical: "Waymo Cafe", points: 34 },
    { round: 2, typo: "google", canonical: "Google Cafe", points: 34 },
    ...confirmationClues,
    ...activityClues.map(clue => ({ ...clue, round: activityRound })),
    { round: cookingRound, typo: cookingTypo, canonical: cookingAnswer, points: 74 },
    { round: cookingRound, typo: longerCookingTypo, canonical: cookingAnswer, points: 74 },
    { round: 3, typo: "Cxrpenxersvixle", canonical: "Carpentersville", points: 94 },
    { round: cookingRound, typo: missingWordAnswer, canonical: cookingAnswer, points: 74 },
  ]) {
    const data = { round, answer: typo, elapsedMs: 1000 };
    const checked = await call("/practice/answer", "POST", undefined, data);
    assert.equal(checked.status, 200);
    assert.equal(checked.data.matched, false);
    assert.equal(checked.data.points, 0);
    assert.equal(checked.data.basePoints, 0);
    assert.equal(checked.data.speedBonus, 0);
    assert.deepEqual(checked.data.answerCorrection, { originalAnswer: typo, correctedAnswer: canonical });
    const confirmed = await call("/practice/answer", "POST", undefined,
      { ...data, answer: canonical.toUpperCase(), elapsedMs: 7500 });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.data.matched, true);
    assert.equal(confirmed.data.canonicalAnswer, canonical);
    assert.equal(confirmed.data.points, points);
    assert.ok(!confirmed.data.answerCorrection);
  }
  const originalRestaurant = await call("/practice/answer", "POST", undefined,
    { round: 2, answer: "So Gong Dong Tofu House", elapsedMs: 7500 });
  assert.equal(originalRestaurant.status, 200);
  assert.equal(originalRestaurant.data.matched, true);
  assert.equal(originalRestaurant.data.canonicalAnswer, "SGD Tofu House");
  assert.equal(originalRestaurant.data.basePoints, 60);
  assert.ok(!originalRestaurant.data.answerCorrection);
  const rejectedRestaurant = await call("/practice/answer", "POST", undefined,
    { round: 2, answer: "So Gond Doo", elapsedMs: 7500 });
  assert.equal(rejectedRestaurant.status, 200);
  assert.equal(rejectedRestaurant.data.matched, false);
  assert.equal(rejectedRestaurant.data.points, 0);
  assert.ok(!rejectedRestaurant.data.answerCorrection);
  const exactFriedRice = await call("/practice/answer", "POST", undefined,
    { round: cookingRound, answer: "FRIED RICE", elapsedMs: 1000 });
  assert.equal(exactFriedRice.status, 200);
  assert.equal(exactFriedRice.data.canonicalAnswer, "Fried Rice");
  assert.equal(exactFriedRice.data.basePoints, 20);
  assert.ok(!exactFriedRice.data.answerCorrection);
  for (const answer of ["Mini Golf", "GOLFLAND"]) {
    const activity = await call("/practice/answer", "POST", undefined, { round: activityRound, answer, elapsedMs: 7500 });
    assert.equal(activity.status, 200);
    assert.equal(activity.data.canonicalAnswer, "Minigolf/Golfland");
    assert.equal(activity.data.points, 74);
    assert.ok(!activity.data.answerCorrection);
  }
  for (const answer of ["Charlie", "walks", "walking"]) {
    const activity = await call("/practice/answer", "POST", undefined, { round: activityRound, answer, elapsedMs: 7500 });
    assert.equal(activity.status, 200);
    assert.equal(activity.data.canonicalAnswer, "Walks/Charlie");
    assert.equal(activity.data.points, 34);
    assert.ok(!activity.data.answerCorrection);
  }
  for (const answer of ["google", "waymo"]) {
    const exactBobaPlace = await call("/practice/answer", "POST", undefined, { round: 6, answer, elapsedMs: 1000 });
    assert.equal(exactBobaPlace.status, 200);
    assert.equal(exactBobaPlace.data.matched, true);
    assert.ok(!exactBobaPlace.data.answerCorrection);
  }
  const wrongQuestion = await call("/practice/answer", "POST", undefined,
    { round: 3, answer: "Bruno Mars", elapsedMs: 1000 });
  assert.equal(wrongQuestion.status, 200);
  assert.equal(wrongQuestion.data.matched, false);
  for (const data of [
    { round: 1, answer: "   ", elapsedMs: 1000 },
    { round: 1, answer: "Phil Wickham", elapsedMs: 25001 },
    { round: ROUND_COUNT + 1, answer: "Phil Wickham", elapsedMs: 1000 },
  ]) assert.equal((await call("/practice/answer", "POST", undefined, data)).status, 400);
  const customAvatar = "b1:11:21:23:13"; // Black sesame and a turtle, saved on the guest's lobby profile.
  const joinAvatar = "b1:6:11:9:12"; // Blueberry with a schnauzer.
  for (const hostName of ["  ", "x".repeat(33), "<name>"]) {
    const invalid = await call("/rooms", "POST", undefined, { hostName });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.field, "name");
  }
  const created = await call("/rooms", "POST", undefined, { hostName: "Smoke moderator", avatar: "b1:2:12:8:9" });
  assert.equal(created.status, 201);
  assert.equal(created.data.room.avatar, "b1:2:12:8:9");
  const host = created.data.sessionToken, code = created.data.room.code, root = `/rooms/${code}`;
  const [row] = await db.select({ id: scoopPlayersTable.roomId }).from(scoopPlayersTable)
    .where(eq(scoopPlayersTable.sessionHash, hashSessionToken(host)));
  roomId = row.id;
  assert.match(code, /^[A-Z]{3}$/);
  assert.equal((await call(`/rooms/${code.toLowerCase()}`, "GET", host)).status, 200);
  // Give only this temporary room each legacy code format, then restore its new code.
  const legacyCode = `L${randomBytes(3).toString("hex").slice(0, 5).toUpperCase()}`;
  for (const previous of ["0000", legacyCode]) {
    await db.update(scoopRoomsTable).set({ code: previous }).where(eq(scoopRoomsTable.id, roomId));
    const legacyRoot = `/rooms/${previous.toLowerCase()}`;
    assert.equal((await call(legacyRoot, "GET", host)).status, 200);
    assert.equal((await call(`${legacyRoot}/players`, "POST", undefined, { displayName: "Smoke moderator" })).status, 409);
  }
  await db.update(scoopRoomsTable).set({ code }).where(eq(scoopRoomsTable.id, roomId));
  assert.equal(created.data.room.questionCount, ROUND_COUNT);
  assert.deepEqual(created.data.room.questions, questionBank.map(q => q.prompt));
  assert.equal(created.data.room.roundDuration, 25);
  assert.equal((await call(`${root}/start`, "POST", host)).status, 409);
  const invalidCode = await call("/rooms/AB3/players", "POST", undefined, { displayName: "Smoke guest" });
  assert.equal(invalidCode.status, 400);
  assert.equal(invalidCode.data.field, "code");
  const missingRoom = await call(`/rooms/${legacyCode}/players`, "POST", undefined, { displayName: "Smoke guest" });
  assert.equal(missingRoom.status, 404);
  assert.equal(missingRoom.data.field, "code");
  for (const displayName of ["  ", "x".repeat(33), "A\u0000B", "!!!"]) {
    const invalid = await call(`${root}/players`, "POST", undefined, { displayName });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.field, "name");
  }
  const reserved = await call(`${root}/players`, "POST", undefined, { displayName: " smoke   MODERATOR " });
  assert.equal(reserved.status, 409);
  assert.equal(reserved.data.field, "name");
  const tokens: string[] = [];
  const raced = await Promise.all(["  Smoke   guest 1 ", "SMOKE GUEST 1"].map(displayName =>
    call(`${root}/players`, "POST", undefined, { displayName, avatar: joinAvatar })));
  assert.deepEqual(raced.map(r => r.status).sort(), [201, 409]);
  assert.equal(raced.find(r => r.status === 409)?.data.field, "name");
  const firstGuest = raced.find(r => r.status === 201)!;
  assert.equal(firstGuest.data.room.avatar, joinAvatar);
  const self = firstGuest.data.room.players.find((p: { id: string }) => p.id === firstGuest.data.room.playerId);
  assert.match(self.displayName, /^smoke guest 1$/i);
  tokens.push(firstGuest.data.sessionToken);
  const specialGuests = new Map<string, string>();
  assert.equal((await call(`${root}/players`, "POST", undefined, { displayName: "Dan", avatar: "party-daniel" })).status, 400);
  for (const [displayName, avatar, expected] of [
    ["  dAnIeL ", "taro", "party-daniel"],
    ["Smoke guest 3", "strawberry", "strawberry"],
    ["AMY", "coconut", "party-amy"],
  ]) {
    const joined = await call(`${root}/players`, "POST", undefined, { displayName, avatar });
    assert.equal(joined.status, 201); tokens.push(joined.data.sessionToken);
    assert.equal(joined.data.room.avatar, expected);
    if (avatar !== expected) {
      specialGuests.set(joined.data.room.playerId, expected);
      // Simulate a seat saved before the party exclusives existed, in this
      // temporary test room only. Its look must still match the join preview.
      await db.update(scoopPlayersTable).set({ avatar })
        .where(eq(scoopPlayersTable.id, joined.data.room.playerId));
      const change = await call(`${root}/profile`, "PUT", joined.data.sessionToken, { avatar });
      assert.equal(change.status, 409);
      assert.match(change.data.error, /locked to your seat/);
      assert.equal((await call(root, "GET", joined.data.sessionToken)).data.avatar, expected);
      const hostRoster = (await call(root, "GET", host)).data.players;
      assert.equal(hostRoster.find((p: { id: string }) => p.id === joined.data.room.playerId).avatar, expected);
      const [saved] = await db.select({ avatar: scoopPlayersTable.avatar }).from(scoopPlayersTable)
        .where(eq(scoopPlayersTable.id, joined.data.room.playerId));
      assert.equal(saved.avatar, avatar, "normalizing the displayed look does not overwrite the saved seat");
    }
  }
  assert.equal((await call(`${root}/profile`, "PUT", tokens[0], { avatar: "party-amy" })).status, 400);
  assert.equal((await call(`${root}/players`, "POST", undefined, { displayName: "Invalid style", avatar: "b1:12:8:8:8" })).status, 400);
  assert.equal((await call(root, "GET", tokens[0])).data.avatar, joinAvatar);
  assert.equal((await call(`${root}/settings`, "PUT", tokens[0], { roundDuration: 25 })).status, 403);
  assert.equal((await call(`${root}/settings`, "PUT", host, { roundDuration: 25 })).status, 200);
  for (const duration of [0, 24, 26, 30, 60, 90]) {
    assert.equal((await call(`${root}/settings`, "PUT", host, { roundDuration: duration })).status, 400);
  }
  const profile = await call(`${root}/profile`, "PUT", tokens[0], { avatar: "matcha" });
  assert.equal(profile.data.avatar, "matcha");
  assert.equal((await call(root, "GET", tokens[0])).data.avatar, "matcha");
  const dressed = await call(`${root}/profile`, "PUT", tokens[0], { avatar: customAvatar });
  assert.equal(dressed.status, 200);
  assert.equal(dressed.data.avatar, customAvatar);
  assert.equal((await call(`${root}/profile`, "PUT", tokens[0], { avatar: "b1:12:0:0:0" })).status, 400);
  assert.equal((await call(`${root}/profile`, "PUT", undefined, { avatar: customAvatar })).status, 401);
  const dressedAgain = (await call(root, "GET", tokens[0])).data;
  assert.equal(dressedAgain.avatar, customAvatar);
  assert.equal((await call(root, "GET", host)).data.players.find((p: { id: string }) => p.id === dressedAgain.playerId).avatar, customAvatar);
  assert.equal((await call(`${root}/start`, "POST", tokens[0])).status, 403);
  // A saved lobby from before the fixed-duration rule must also start with 25 seconds.
  await db.update(scoopRoomsTable).set({ roundDuration: 60 }).where(eq(scoopRoomsTable.id, roomId));
  assert.equal((await call(root, "GET", host)).data.roundDuration, 25);
  let transitionRequestedAt = Date.now();
  const [start, repeatedStart] = await Promise.all([
    call(`${root}/start`, "POST", host),
    call(`${root}/start`, "POST", host),
  ]);
  assert.equal(start.status, 200);
  assert.equal(repeatedStart.status, 200);
  assert.equal(start.data.round, 1);
  assert.equal(repeatedStart.data.round, 1);
  assert.equal(repeatedStart.data.roundStartedAt, start.data.roundStartedAt);
  assert.equal(repeatedStart.data.roundEndsAt, start.data.roundEndsAt);
  assert.equal((await call(`${root}/profile`, "PUT", tokens[0], { avatar: "taro" })).status, 409);
  assert.equal((await call(`${root}/settings`, "PUT", host, { roundDuration: 25 })).status, 409);
  assert.equal((await call(`${root}/players`, "POST", undefined, { displayName: "Late guest" })).status, 409);
  assert.equal((await call(`${root}/reveal`, "POST", host)).status, 409);
  assert.equal((await call(`${root}/next`, "POST", host)).status, 400);
  assert.equal((await call(`${root}/next`, "POST", host, { round: 1 })).status, 409);
  assert.equal((await call(root, "GET", "bad-session")).status, 401);
  let total = 0;
  for (let round = 1; round <= ROUND_COUNT; round++) {
    const before = (await call(root, "GET", host)).data;
    assert.equal(before.round, round);
    assert.equal(before.roundDuration, 25);
    const opensAt = Date.parse(before.roundStartedAt);
    assert.ok(opensAt >= transitionRequestedAt + 3000 && opensAt <= Date.parse(before.serverNow) + 3000,
      "The round is scheduled three seconds after the host action, not when each guest arrives.");
    assert.equal(Date.parse(before.roundEndsAt) - opensAt, 25_000);
    assert.ok(before.players.every((p: { hasAnswered: boolean }) => !p.hasAnswered));
    assert.equal((await call(root, "GET", tokens[0])).data.myTotalPoints, total);
    const answer = round === 1 ? "Sovereign Grace Music"
      : round === 2 ? "SGD Tofu House"
      : round === cookingRound ? cookingAnswer
      : round === activityRound ? "Minigolf"
      : round === itemRound ? "labubu" : questionBank[round - 1].catalog[0].answer;
    const canonical = round === itemRound ? "Labubu | Lafufu" : round === activityRound ? "Minigolf/Golfland" : answer;
    if (round <= 2) {
      const early = await call(`${root}/answer`, "PUT", tokens[0], { answer, round });
      assert.equal(early.status, 409);
      assert.match(early.data.error, /hasn't started yet/);
      const unscored = (await call(root, "GET", tokens[0])).data;
      assert.equal(unscored.submittedCount, 0);
      assert.equal(unscored.myReward, null);
      // Round one: a late refresh still inside the buffer. Round two: the
      // same guest gets the update after opening and must not get a new clock.
      await sleep(Math.max(0, opensAt - Date.now() + (round === 1 ? -700 : 500)));
      const latePhone = (await call(root, "GET", tokens[3])).data;
      assert.equal(latePhone.currentQuestion, before.currentQuestion);
      assert.equal(latePhone.roundStartedAt, before.roundStartedAt);
      assert.equal(latePhone.roundEndsAt, before.roundEndsAt);
      assert.equal(latePhone.submittedCount, 0);
      assert.equal(Date.parse(latePhone.serverNow) < opensAt, round === 1);
    }
    await sleep(Math.max(0, opensAt - Date.now()) + 10);
    if (round > 1) assert.equal((await call(`${root}/answer`, "PUT", tokens[0], { answer, round: round - 1 })).status, 409);
    for (const { typo, canonical } of confirmationClues.filter(clue => clue.round === round)) {
      const offered = await call(`${root}/answer`, "PUT", tokens[0], { answer: typo, round });
      assert.equal(offered.status, 200);
      assert.deepEqual(offered.data.answerCorrection, { originalAnswer: typo, correctedAnswer: canonical });
      assert.equal(offered.data.submitted, false);
      assert.equal(offered.data.myReward, null);
      assert.equal(offered.data.myTotalPoints, total);
      assert.equal(offered.data.roundEndsAt, before.roundEndsAt);
    }
    if (round === cookingRound) {
      for (const typed of [cookingTypo, longerCookingTypo, missingWordAnswer]) {
        const suggestion = await call(`${root}/answer`, "PUT", tokens[0], { answer: typed, round });
        assert.equal(suggestion.status, 200);
        assert.deepEqual(suggestion.data.answerCorrection, { originalAnswer: typed, correctedAnswer: answer });
        assert.equal(suggestion.data.submitted, false);
        assert.equal(suggestion.data.myReward, null);
        assert.equal(suggestion.data.myTotalPoints, total);
        assert.equal(suggestion.data.roundEndsAt, before.roundEndsAt);
      }
      const hostView = (await call(root, "GET", host)).data;
      assert.equal(hostView.submittedCount, 0);
      assert.ok(!("answerCorrection" in hostView));
    }
    if (round === activityRound) {
      for (const { typo, canonical: correctedAnswer } of activityClues) {
        const offered = await call(`${root}/answer`, "PUT", tokens[0], { answer: typo, round });
        assert.equal(offered.status, 200);
        assert.deepEqual(offered.data.answerCorrection, { originalAnswer: typo, correctedAnswer });
        assert.equal(offered.data.submitted, false);
        assert.equal(offered.data.submittedCount, 0);
        assert.equal(offered.data.myReward, null);
        assert.equal(offered.data.roundEndsAt, before.roundEndsAt);
      }
    }
    const saved = await call(`${root}/answer`, "PUT", tokens[0], { answer: round === 1 ? answer.toUpperCase() : answer, round });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.submitted, true);
    assert.equal(saved.data.myAnswer, canonical);
    assert.ok(!("answerCorrection" in saved.data));
    assert.equal(saved.data.possibleAnswers.length, 0);
    assert.equal(saved.data.roundStandings.length, 0);
    assert.equal(saved.data.answers.length, 0);
    const liveReward = saved.data.myReward;
    assert.equal(liveReward.points, liveReward.basePoints + liveReward.speedBonus);
    assert.equal(saved.data.myTotalPoints, total + liveReward.points);
    const refetched = (await call(root, "GET", tokens[0])).data;
    assert.deepEqual(refetched.myReward, liveReward);
    assert.equal(refetched.myTotalPoints, saved.data.myTotalPoints);
    assert.equal(refetched.myAnswer, canonical);
    assert.equal(refetched.avatar, customAvatar);
    assert.equal(refetched.standings.find((s: { playerId: string }) => s.playerId === saved.data.playerId).points, total);
    assert.equal((await call(`${root}/answer`, "PUT", tokens[0], { answer: "overwrite", round })).status, 409);
    const rejected = await call(`${root}/answer`, "PUT", tokens[1], { answer: "unlisted smoke answer", round });
    assert.equal(rejected.status, 200);
    assert.match(rejected.data.answerFeedback, /Try another answer/);
    assert.equal(rejected.data.submitted, false);
    assert.ok(!("error" in rejected.data));
    const afterReject = (await call(root, "GET", tokens[1])).data;
    assert.equal(afterReject.submitted, false);
    assert.equal(afterReject.myReward, null);
    assert.equal(afterReject.myAnswer, null);
    assert.ok(!("answerFeedback" in afterReject), "Rejection feedback is transient, not saved room state.");
    assert.equal(afterReject.roundEndsAt, before.roundEndsAt, "Invalid attempts do not restart the live deadline.");
    if (round === 1) {
      const suggested = await call(`${root}/answer`, "PUT", tokens[1], { answer: "Bruno Mras", round });
      assert.equal(suggested.status, 200);
      assert.deepEqual(suggested.data.answerCorrection, { originalAnswer: "Bruno Mras", correctedAnswer: "Bruno Mars" });
      assert.equal(suggested.data.submitted, false);
      assert.equal(suggested.data.myAnswer, null);
      assert.equal(suggested.data.myReward, null);
      assert.equal(suggested.data.myTotalPoints, 0);
      assert.equal(suggested.data.submittedCount, 1);
      assert.equal(suggested.data.roundEndsAt, before.roundEndsAt);
      const afterSuggestion = (await call(root, "GET", tokens[1])).data;
      assert.ok(!("answerCorrection" in afterSuggestion), "Suggestions are private, transient and never stored.");
      assert.equal(afterSuggestion.submitted, false);
      assert.ok(!("answerCorrection" in (await call(root, "GET", host)).data));
    }
    const other = await call(`${root}/answer`, "PUT", tokens[1], {
      answer: round === 1 ? "Bruno Mars" : round === cookingRound ? "FRIED RICE"
        : round === itemRound ? "LAFUFU" : round === activityRound ? "Golfland" : answer, round,
    });
    assert.equal(other.status, 200); // Same answer is allowed across players, scores are individual.
    assert.equal(other.data.submittedCount, 2);
    if (round === 1) {
      assert.equal(other.data.myAnswer, "Bruno Mars", "Display and store the confirmed canonical spelling.");
      assert.equal(other.data.myReward.basePoints, 20, "A confirmed correction receives the canonical answer's reward.");
      assert.equal((await call(`${root}/answer`, "PUT", tokens[3], { answer: "Bruno Mars", round })).status, 200);
    }
    if (round === cookingRound) {
      assert.equal(other.data.myAnswer, "Fried Rice");
      assert.equal(other.data.myReward.basePoints, 20);
      assert.ok(!other.data.answerCorrection);
      // Simulate a pre-formatting submission in this temporary room only.
      await db.update(scoopAnswersTable).set({ answer: "fried rice" }).where(and(
        eq(scoopAnswersTable.roomId, roomId!), eq(scoopAnswersTable.playerId, other.data.playerId),
        eq(scoopAnswersTable.answer, "Fried Rice"),
      ));
      const oldCase = (await call(root, "GET", tokens[1])).data;
      assert.equal(oldCase.myAnswer, "Fried Rice");
      assert.deepEqual(oldCase.myReward, other.data.myReward);
    }
    const alsoRejected = await call(`${root}/answer`, "PUT", tokens[2], { answer: "unlisted smoke answer", round });
    assert.equal(alsoRejected.status, 200);
    assert.equal(alsoRejected.data.submitted, false);
    const hidden = (await call(root, "GET", host)).data;
    assert.equal(hidden.myAnswer, null);
    assert.equal(hidden.myReward, null);
    assert.equal(hidden.myTotalPoints, 0);
    assert.equal(hidden.answers.length, 0); assert.equal(hidden.possibleAnswers.length, 0);
    const submitted = round === 1 ? 3 : 2;
    assert.equal(hidden.submittedCount, submitted);
    assert.equal(hidden.players.filter((p: { hasAnswered: boolean }) => p.hasAnswered).length, submitted);
    assert.equal(hidden.players.find((p: { isHost: boolean }) => p.isHost).hasAnswered, false);
    assert.ok(hidden.players.every((p: object) => !("answer" in p) && !("points" in p)));
    assert.equal(hidden.roundStandings.length, 0);
    const publicState = (await call(root)).data;
    assert.equal(publicState.standings.length, 0);
    assert.equal(publicState.myTotalPoints, 0);
    assert.equal(publicState.myReward, null);
    assert.ok(publicState.players.every((p: { hasAnswered: boolean }) => !p.hasAnswered));
    assert.equal(hidden.phase, "answering", "Results stay private while any guest still has no accepted answer.");
    const earlyReveal = round <= 2;
    if (round === 1) {
      // Even the final guest's typo suggestion must not close the round until accepted.
      const suggestion = await call(`${root}/answer`, "PUT", tokens[2], { answer: "sovreign grace", round });
      assert.equal(suggestion.status, 200);
      assert.deepEqual(suggestion.data.answerCorrection, { originalAnswer: "sovreign grace", correctedAnswer: answer });
      assert.equal(suggestion.data.phase, "answering");
      assert.equal(suggestion.data.submitted, false);
      assert.equal(suggestion.data.submittedCount, 3);
      assert.equal(suggestion.data.myReward, null);
      assert.equal(suggestion.data.myTotalPoints, 0);
      assert.equal(suggestion.data.roundEndsAt, before.roundEndsAt);
      assert.ok(!("answerCorrection" in (await call(root, "GET", host)).data));
      assert.ok(!("answerCorrection" in (await call(root, "GET", tokens[1])).data));
      assert.ok(!("answerCorrection" in (await call(root, "GET", tokens[2])).data));
      const last = await call(`${root}/answer`, "PUT", tokens[2], { answer: suggestion.data.answerCorrection.correctedAnswer, round });
      assert.equal(last.status, 200);
      assert.equal(last.data.phase, "revealed", "The final accepted submission reveals results in its own response.");
      assert.equal(last.data.submittedCount, 4, "The host is not required to answer.");
      assert.equal(last.data.roundEndsAt, before.roundEndsAt, "Early completion does not rewrite the scoring deadline.");
      assert.equal(last.data.myAnswer, answer);
      assert.equal(last.data.myReward.basePoints, 100);
      assert.equal(last.data.myReward.speedBonus, Math.round(20 * (1 - last.data.myReward.elapsedMs / 25000)));
      assert.ok(Date.parse(last.data.serverNow) < Date.parse(last.data.roundEndsAt), "Early results appear before 25 seconds.");
    } else if (round === 2) {
      const shortcuts = [
        { originalAnswer: "waymo", correctedAnswer: "Waymo Cafe" },
        { originalAnswer: "google", correctedAnswer: "Google Cafe" },
      ];
      const suggested = await Promise.all(shortcuts.map((shortcut, i) =>
        call(`${root}/answer`, "PUT", tokens[i + 2], { answer: shortcut.originalAnswer, round })));
      for (const [i, response] of suggested.entries()) {
        assert.equal(response.status, 200);
        assert.deepEqual(response.data.answerCorrection, shortcuts[i]);
        assert.equal(response.data.submitted, false);
        assert.equal(response.data.myReward, null);
        assert.equal(response.data.roundEndsAt, before.roundEndsAt);
      }
      assert.equal((await call(root, "GET", host)).data.submittedCount, 2);
      const lastTwo = await Promise.all(shortcuts.map((shortcut, i) =>
        call(`${root}/answer`, "PUT", tokens[i + 2], { answer: shortcut.correctedAnswer, round })));
      assert.ok(lastTwo.every(r => r.status === 200), "Concurrent final submissions both save exactly once.");
      assert.ok(lastTwo.some(r => r.data.phase === "revealed"));
      assert.ok(lastTwo.every((r, i) => r.data.myAnswer === shortcuts[i].correctedAnswer && r.data.myReward.basePoints === 20));
    } else {
      // Advance only this smoke room's deadline; missing guests still use the normal timeout.
      await db.update(scoopRoomsTable).set({ roundEndsAt: new Date(Date.now() - 100) }).where(eq(scoopRoomsTable.id, roomId));
    }
    const revealed = (await call(root, "GET", host)).data;
    assert.equal(revealed.phase, "revealed");
    assert.equal(revealed.roundStandings.length, 4);
    assert.equal(revealed.possibleAnswers.length, questionBank[round - 1].catalog.length);
    if (round === 1) {
      const credited = revealed.possibleAnswers.find((entry: { answer: string }) => entry.answer === "Bruno Mars");
      assert.equal(credited.submittedCount, 2, "The catalog counts exact and typo submissions together.");
      assert.equal(credited.submitted, true);
      assert.equal(revealed.answers.find((group: { answer: string }) => group.answer === "Bruno Mars").count, 2);
    }
    if (round === itemRound) {
      const alias = "Labubu | Lafufu";
      assert.equal(revealed.possibleAnswers.find((entry: { answer: string }) => entry.answer === alias).submittedCount, 2);
      assert.deepEqual(revealed.answers.map((group: { answer: string; count: number }) => [group.answer, group.count]), [[alias, 2]]);
    }
    if (round === activityRound) {
      assert.equal(other.data.myAnswer, canonical);
      assert.equal(other.data.myReward.basePoints, saved.data.myReward.basePoints);
      assert.ok(!other.data.answerCorrection);
      assert.equal(revealed.possibleAnswers.find((entry: { answer: string }) => entry.answer === canonical).submittedCount, 2);
      assert.deepEqual(revealed.answers.map((group: { answer: string; count: number }) => [group.answer, group.count]), [[canonical, 2]]);
    }
    const playerReveal = (await call(root, "GET", tokens[0])).data;
    const reward = playerReveal.myReward;
    assert.equal(reward.points, reward.basePoints + reward.speedBonus);
    assert.equal(reward.speedBonus, Math.round(20 * (1 - reward.elapsedMs / 25000)));
    total += reward.points;
    assert.equal(reward.points, liveReward.points);
    assert.equal(playerReveal.myTotalPoints, total);
    assert.deepEqual(playerReveal.roundStandings, revealed.roundStandings);
    assert.deepEqual(playerReveal.possibleAnswers, revealed.possibleAnswers);
    assert.equal(revealed.roundStandings.find((s: { playerId: string }) => s.playerId === saved.data.playerId).avatar, customAvatar);
    assert.equal(revealed.standings.find((s: { playerId: string }) => s.playerId === saved.data.playerId).avatar, customAvatar);
    const thirdGuest = revealed.roundStandings.find((s: { displayName: string }) => s.displayName === "Smoke guest 3");
    if (earlyReveal) {
      assert.ok(thirdGuest.points > 0);
      assert.equal(thirdGuest.answer, round === 2 ? "Waymo Cafe" : answer);
      assert.equal(revealed.submittedCount, 4);
      assert.ok(Date.parse(revealed.serverNow) < Date.parse(revealed.roundEndsAt));
    } else {
      assert.equal(thirdGuest.points, 0);
      assert.equal(thirdGuest.answer, null);
    }
    assert.equal(revealed.standings.find((s: { playerId: string }) => s.playerId === saved.data.playerId).points, total);
    assert.equal(revealed.roundStandings[0].points >= revealed.roundStandings[1].points, true);
    assert.equal((await call(`${root}/answer`, "PUT", tokens[3], { answer, round })).status, 409);
    assert.equal((await call(`${root}/next`, "POST", tokens[0], { round })).status, 403);
    if (round < ROUND_COUNT) assert.equal((await call(`${root}/next`, "POST", host, { round: round + 1 })).status, 409);
    if (round > 1) {
      const delayed = await call(`${root}/next`, "POST", host, { round: round - 1 });
      assert.equal(delayed.status, 200);
      assert.equal(delayed.data.phase, "revealed", "A delayed Next cannot advance these results.");
      assert.equal(delayed.data.round, round);
      assert.equal(delayed.data.roundEndsAt, revealed.roundEndsAt);
    }
    transitionRequestedAt = Date.now();
    const [next, repeatedNext] = await Promise.all([
      call(`${root}/next`, "POST", host, { round }),
      call(`${root}/next`, "POST", host, { round }),
    ]);
    for (const result of [next, repeatedNext]) {
      assert.equal(result.status, 200);
      assert.equal(result.data.phase, round < ROUND_COUNT ? "answering" : "finished");
      assert.equal(result.data.round, Math.min(round + 1, ROUND_COUNT));
      if (round < ROUND_COUNT) assert.equal(result.data.honorableMentions, undefined);
    }
    assert.equal(repeatedNext.data.roundEndsAt, next.data.roundEndsAt);
    assert.equal(repeatedNext.data.roundStartedAt, next.data.roundStartedAt);
  }
  const repeatedFinish = await call(`${root}/next`, "POST", host, { round: ROUND_COUNT });
  assert.equal(repeatedFinish.status, 200);
  assert.equal(repeatedFinish.data.phase, "finished");
  assert.equal(repeatedFinish.data.round, ROUND_COUNT);
  const mentions = repeatedFinish.data.honorableMentions;
  assert.ok(Array.isArray(mentions));
  for (const category of ["fastest", "just-in-time"]) assert.ok(mentions.some(a => a.category === category));
  assert.ok(mentions.every(a => repeatedFinish.data.standings.some((s: { playerId: string }) => s.playerId === a.playerId)));
  const guestFinal = await call(root, "GET", tokens[0]);
  assert.equal(guestFinal.data.avatar, customAvatar);
  assert.equal(repeatedFinish.data.standings.find((s: { playerId: string }) => s.playerId === guestFinal.data.playerId).avatar, customAvatar);
  for (const [playerId, expected] of specialGuests)
    assert.equal(repeatedFinish.data.standings.find((s: { playerId: string }) => s.playerId === playerId).avatar, expected);
  assert.deepEqual(guestFinal.data.honorableMentions, mentions, "Guests and the host see the same final awards.");
  const anonymousFinal = await call(root);
  assert.equal(anonymousFinal.data.honorableMentions, undefined, "Final awards stay within the room.");
  process.stdout.write(`PASS: ${ROUND_COUNT} rounds with shared three-second starts, early answer rejection, delayed phone refreshes, full 25-second windows, repeat-safe host controls, immediate all-answered reveal, timeout fallback, private answers, speed scoring, profiles, immutable submissions, refresh recovery and permissions.\n`);
} finally {
  if (roomId) await db.delete(scoopRoomsTable).where(eq(scoopRoomsTable.id, roomId));
  await pool.end();
}

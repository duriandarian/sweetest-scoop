/** Run against the managed development API: pnpm --filter @workspace/api-server exec tsx src/testing/party-smoke.ts
 * Creates its own room, exercises all seven rounds, and removes only that room afterwards.
 */
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, pool, scoopRoomsTable } from "@workspace/db";
import { questionBank } from "../lib/party-scoring";

const base = "http://localhost:80/api";
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
  const customAvatar = "b1:5:13:11:11";
  const created = await call("/rooms", "POST", undefined, { hostName: "Smoke moderator", avatar: "b1:2:12:8:9" });
  assert.equal(created.status, 201);
  assert.equal(created.data.room.avatar, "b1:2:12:8:9");
  const host = created.data.sessionToken, code = created.data.room.code, root = `/rooms/${code}`;
  const [row] = await db.select({ id: scoopRoomsTable.id }).from(scoopRoomsTable).where(eq(scoopRoomsTable.code, code));
  roomId = row.id;
  assert.equal(created.data.room.questionCount, 7);
  assert.equal(created.data.room.roundDuration, 25);
  assert.equal((await call(`${root}/start`, "POST", host)).status, 409);
  const tokens: string[] = [];
  for (const [index, avatar] of ["b1:3:11:9:10", "taro", "strawberry", "coconut"].entries()) {
    const joined = await call(`${root}/players`, "POST", undefined, { displayName: `Smoke guest ${index + 1}`, avatar });
    assert.equal(joined.status, 201); tokens.push(joined.data.sessionToken);
    assert.equal(joined.data.room.avatar, avatar);
  }
  assert.equal((await call(`${root}/players`, "POST", undefined, { displayName: "Invalid style", avatar: "b1:8:8:8:8" })).status, 400);
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
  assert.equal((await call(`${root}/profile`, "PUT", tokens[0], { avatar: "b1:6:0:0:0" })).status, 400);
  assert.equal((await call(`${root}/profile`, "PUT", undefined, { avatar: customAvatar })).status, 401);
  const dressedAgain = (await call(root, "GET", tokens[0])).data;
  assert.equal(dressedAgain.avatar, customAvatar);
  assert.equal((await call(root, "GET", host)).data.players.find((p: { id: string }) => p.id === dressedAgain.playerId).avatar, customAvatar);
  assert.equal((await call(`${root}/start`, "POST", tokens[0])).status, 403);
  // A saved lobby from before the fixed-duration rule must also start with 25 seconds.
  await db.update(scoopRoomsTable).set({ roundDuration: 60 }).where(eq(scoopRoomsTable.id, roomId));
  assert.equal((await call(root, "GET", host)).data.roundDuration, 25);
  assert.equal((await call(`${root}/start`, "POST", host)).status, 200);
  assert.equal((await call(`${root}/profile`, "PUT", tokens[0], { avatar: "taro" })).status, 409);
  assert.equal((await call(`${root}/settings`, "PUT", host, { roundDuration: 25 })).status, 409);
  assert.equal((await call(`${root}/players`, "POST", undefined, { displayName: "Late guest" })).status, 409);
  assert.equal((await call(`${root}/reveal`, "POST", host)).status, 409);
  assert.equal((await call(`${root}/next`, "POST", host)).status, 409);
  assert.equal((await call(root, "GET", "bad-session")).status, 401);
  let total = 0;
  for (let round = 1; round <= 7; round++) {
    const before = (await call(root, "GET", host)).data;
    assert.equal(before.roundDuration, 25);
    assert.equal(Date.parse(before.roundEndsAt) - Date.parse(before.roundStartedAt), 25_000);
    assert.ok(before.players.every((p: { hasAnswered: boolean }) => !p.hasAnswered));
    assert.equal((await call(root, "GET", tokens[0])).data.myTotalPoints, total);
    const answer = round === 1 ? "Sovereign Grace Music" : questionBank[round - 1].catalog[0].answer;
    if (round > 1) assert.equal((await call(`${root}/answer`, "PUT", tokens[0], { answer, round: round - 1 })).status, 409);
    const saved = await call(`${root}/answer`, "PUT", tokens[0], { answer, round });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.submitted, true);
    assert.equal(saved.data.myAnswer, answer);
    assert.equal(saved.data.possibleAnswers.length, 0);
    assert.equal(saved.data.roundStandings.length, 0);
    assert.equal(saved.data.answers.length, 0);
    const liveReward = saved.data.myReward;
    assert.equal(liveReward.points, liveReward.basePoints + liveReward.speedBonus);
    assert.equal(saved.data.myTotalPoints, total + liveReward.points);
    const refetched = (await call(root, "GET", tokens[0])).data;
    assert.deepEqual(refetched.myReward, liveReward);
    assert.equal(refetched.myTotalPoints, saved.data.myTotalPoints);
    assert.equal(refetched.myAnswer, answer);
    assert.equal(refetched.avatar, customAvatar);
    assert.equal(refetched.standings.find((s: { playerId: string }) => s.playerId === saved.data.playerId).points, total);
    assert.equal((await call(`${root}/answer`, "PUT", tokens[0], { answer: "overwrite", round })).status, 409);
    const other = await call(`${root}/answer`, "PUT", tokens[1], { answer: round === 1 ? "Bruno Mras" : answer, round });
    assert.equal(other.status, 200); // Same answer is allowed across players, scores are individual.
    assert.equal(other.data.submittedCount, 2);
    if (round === 1) {
      assert.equal(other.data.myAnswer, "Bruno Mras", "Preserve the player's original spelling.");
      assert.equal(other.data.myReward.basePoints, 20, "A clear typo receives the canonical answer's reward.");
      assert.equal((await call(`${root}/answer`, "PUT", tokens[3], { answer: "Bruno Mars", round })).status, 200);
    }
    assert.equal((await call(`${root}/answer`, "PUT", tokens[2], { answer: "unlisted smoke answer", round })).data.myReward.points, 0);
    const hidden = (await call(root, "GET", host)).data;
    assert.equal(hidden.myAnswer, null);
    assert.equal(hidden.myReward, null);
    assert.equal(hidden.myTotalPoints, 0);
    assert.equal(hidden.answers.length, 0); assert.equal(hidden.possibleAnswers.length, 0);
    const submitted = round === 1 ? 4 : 3;
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
    // Advance only this smoke room's deadline so the seven-round suite doesn't take several minutes.
    await db.update(scoopRoomsTable).set({ roundEndsAt: new Date(Date.now() - 100) }).where(eq(scoopRoomsTable.id, roomId));
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
    assert.equal(revealed.roundStandings.find((s: { answer: string }) => s.answer === "unlisted smoke answer").points, 0);
    assert.equal(revealed.standings.find((s: { playerId: string }) => s.playerId === saved.data.playerId).points, total);
    assert.equal(revealed.roundStandings[0].points >= revealed.roundStandings[1].points, true);
    assert.equal((await call(`${root}/answer`, "PUT", tokens[3], { answer, round })).status, 409);
    assert.equal((await call(`${root}/next`, "POST", tokens[0])).status, 403);
    const next = await call(`${root}/next`, "POST", host);
    assert.equal(next.status, 200);
    assert.equal(next.data.phase, round < 7 ? "answering" : "finished");
    assert.equal(next.data.round, round < 7 ? round + 1 : 7);
  }
  assert.equal((await call(`${root}/next`, "POST", host)).status, 409);
  process.stdout.write("PASS: seven-round multiplayer, deadlines, private answers, speed scoring, profiles, immutable submissions, refresh recovery and permissions.\n");
} finally {
  if (roomId) await db.delete(scoopRoomsTable).where(eq(scoopRoomsTable.id, roomId));
  await pool.end();
}

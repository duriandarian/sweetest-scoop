/** Development only: pnpm --filter @workspace/api-server exec tsx src/testing/word-forms-smoke.ts */
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import type { RoomState } from "@workspace/api-zod";
import { db, pool, scoopPlayersTable, scoopRoomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { questionBank, ROUND_COUNT } from "../lib/party-scoring";
import { hashSessionToken } from "../lib/room-session";

type Session = { sessionToken: string; room: RoomState };
const base = "http://localhost:80/api";
let roomId: string | undefined;
async function call<T = RoomState>(path: string, method = "GET", token?: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { "X-Session-Token": token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  assert.ok(response.ok, `${method} ${response.status}`);
  return response.json() as Promise<T>;
}

try {
  const practice = (round: number, answer: string) => call<{
    answerCorrection?: RoomState["answerCorrection"]; points: number; matched: boolean; canonicalAnswer?: string;
  }>("/practice/answer", "POST", undefined, { round, answer, elapsedMs: 7500 });
  const expected = { originalAnswer: "PaTiEnCe", correctedAnswer: "Patient" };
  const suggestion = await practice(ROUND_COUNT, "PaTiEnCe");
  assert.deepEqual(suggestion.answerCorrection, expected);
  assert.equal(suggestion.points, 0);
  assert.equal(suggestion.matched, false);
  assert.equal((await practice(ROUND_COUNT, "PATIENT")).points, 94);
  assert.equal((await practice(ROUND_COUNT - 1, "patience")).answerCorrection, undefined);

  const created = await call<Session>("/rooms", "POST", undefined, { hostName: "Word forms smoke host" });
  const [seat] = await db.select({ roomId: scoopPlayersTable.roomId }).from(scoopPlayersTable)
    .where(eq(scoopPlayersTable.sessionHash, hashSessionToken(created.sessionToken)));
  roomId = seat.roomId;
  const root = `/rooms/${created.room.code}`;
  const guest = await call<Session>(`${root}/players`, "POST", undefined, { displayName: "Word forms smoke guest" });
  const host = created.sessionToken, player = guest.sessionToken;
  const submit = (round: number, answer: string) => call(`${root}/answer`, "PUT", player, { round, answer });
  let state = await call(`${root}/start`, "POST", host);
  for (let round = 1; round <= ROUND_COUNT; round++) {
    assert.equal(state.round, round);
    assert.ok(state.roundStartedAt);
    await sleep(Math.max(0, Date.parse(state.roundStartedAt) - Date.now()) + 20);
    if (round < ROUND_COUNT) {
      assert.equal((await submit(round, questionBank[round - 1].catalog[0].answer)).phase, "revealed");
      state = await call(`${root}/next`, "POST", host, { round });
    }
  }
  const before = await call(root, "GET", player);
  const offered = await submit(ROUND_COUNT, "PaTiEnCe");
  assert.deepEqual(offered.answerCorrection, expected);
  assert.equal(offered.submitted, false);
  assert.equal(offered.myReward, null);
  assert.equal(offered.myTotalPoints, before.myTotalPoints);
  assert.equal(offered.roundEndsAt, before.roundEndsAt);
  const hostView = await call(root, "GET", host);
  assert.equal(hostView.phase, "answering");
  assert.equal(hostView.submittedCount, 0);
  assert.equal(hostView.answerCorrection, undefined);
  await sleep(500);
  const confirmed = await submit(ROUND_COUNT, expected.correctedAnswer);
  assert.equal(confirmed.phase, "revealed");
  assert.equal(confirmed.submitted, true);
  assert.equal(confirmed.myAnswer, "Patient");
  assert.equal(confirmed.roundEndsAt, before.roundEndsAt);
  assert.ok(confirmed.myReward);
  assert.equal(confirmed.myReward.basePoints, 80);
  assert.ok(confirmed.myReward.elapsedMs >= Date.parse(offered.serverNow!) - Date.parse(before.roundStartedAt!) + 450);
  assert.equal(confirmed.myReward.speedBonus, Math.round(20 * (1 - confirmed.myReward.elapsedMs / 25000)));
  process.stdout.write("PASS: alternate word forms suggest the canonical answer privately in Practice and multiplayer, scoring only after confirmation.\n");
} finally {
  if (roomId) await db.delete(scoopRoomsTable).where(eq(scoopRoomsTable.id, roomId));
  await pool.end();
}

/** Run against an idle development API and database, without other room-creation tests. */
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { eq, inArray } from "drizzle-orm";
import type { RoomState } from "@workspace/api-zod";
import { db, pool, scoopAnswersTable, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import { questionBank } from "../lib/party-scoring";
import { hashSessionToken } from "../lib/room-session";

const codes = ["DAN", "AMY", "RBF"];
const createdIds: string[] = [];
type Session = { sessionToken: string; room: RoomState };
async function call(path: string, method = "GET", token?: string, body?: object) {
  return fetch(`http://localhost:80/api/rooms${path}`, {
    method, headers: { "Content-Type": "application/json", ...(token ? { "X-Session-Token": token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10_000),
  });
}
async function host(displayName: string) {
  const response = await call("", "POST", undefined, { hostName: displayName });
  assert.equal(response.status, 201);
  const session = await response.json() as Session;
  const [seat] = await db.select({ id: scoopPlayersTable.roomId }).from(scoopPlayersTable)
    .where(eq(scoopPlayersTable.sessionHash, hashSessionToken(session.sessionToken)));
  createdIds.push(seat.id);
  return { ...session, id: seat.id };
}
async function join(code: string, displayName: string) {
  const response = await call(`/${code}/players`, "POST", undefined, { displayName });
  assert.equal(response.status, 201);
  return response.json() as Promise<Session>;
}
async function state(code: string, token?: string) {
  const response = await call(`/${code}`, "GET", token);
  assert.equal(response.status, 200);
  return response.json() as Promise<RoomState>;
}

try {
  const existing = await db.select({ id: scoopRoomsTable.id }).from(scoopRoomsTable).where(inArray(scoopRoomsTable.code, codes));
  assert.equal(existing.length, 0, "Use a development database with no existing rooms from the rotation.");
  const first = await host("First host");
  const second = await host("Second host");
  const third = await host("Third host");
  assert.deepEqual([first.room.code, second.room.code, third.room.code], codes);
  const early = await join("dan", "Original guest");
  const guests = await Promise.all([join("amy", "Second guest"), join("rbf", "Third guest")]);
  const fallbacks = await Promise.all([host("Extra host"), host("Another host")]);
  assert.equal(new Set(fallbacks.map(entry => entry.room.code)).size, 2);
  for (const fallback of fallbacks) {
    assert.match(fallback.room.code, /^[A-Z]{3}$/);
    assert.ok(!codes.includes(fallback.room.code));
  }
  const fallbackGuest = await join(fallbacks[0].room.code.toLowerCase(), "Overflow guest");
  assert.equal((await state(fallbacks[0].room.code, fallbackGuest.sessionToken)).playerId, fallbackGuest.room.playerId);
  assert.equal((await state("DAN", early.sessionToken)).phase, "lobby");
  // Finish this disposable fixture without waiting for eight question timers.
  await db.update(scoopRoomsTable).set({ phase: "finished", round: first.room.questionCount })
    .where(eq(scoopRoomsTable.id, first.id));
  const fourth = await host("Fourth host");
  assert.equal(fourth.room.code, "DAN");
  const late = await join("DaN", "New guest");
  const oldRoom = await state("DAN", early.sessionToken);
  assert.equal(oldRoom.playerId, early.room.playerId);
  assert.equal(oldRoom.code, "DAN");
  assert.equal(oldRoom.phase, "finished");
  assert.deepEqual(oldRoom.players.map(p => p.displayName), ["First host", "Original guest"]);
  assert.equal((await state("dan", first.sessionToken)).isHost, true);
  assert.equal((await state("dan", late.sessionToken)).playerId, late.room.playerId);
  assert.deepEqual((await state("dan")).players.map(p => p.displayName), ["Fourth host", "New guest"]);
  assert.equal((await call("/DAN/profile", "PUT", early.sessionToken, { avatar: "matcha" })).status, 409);
  assert.equal((await call("/DAN/start", "POST", early.sessionToken)).status, 403);
  assert.equal((await call("/DAN/start", "POST", first.sessionToken)).status, 200);
  assert.equal((await call("/DAN", "GET", guests[0].sessionToken)).status, 401);
  assert.equal((await call("/DAN~test")).status, 400);
  assert.equal((await state("DAN", fourth.sessionToken)).phase, "lobby");
  const staleTime = new Date(Date.now() - 61 * 60_000);
  const nearlyStaleTime = new Date(Date.now() - 57 * 60_000);
  await db.update(scoopRoomsTable).set({ createdAt: staleTime, lastActivityAt: nearlyStaleTime })
    .where(eq(scoopRoomsTable.id, second.id));
  const activity = async () => (await db.select({ at: scoopRoomsTable.lastActivityAt }).from(scoopRoomsTable)
    .where(eq(scoopRoomsTable.id, second.id)))[0]?.at;
  assert.equal((await state("amy", guests[0].sessionToken)).playerId, guests[0].room.playerId);
  assert.equal((await activity())?.getTime(), nearlyStaleTime.getTime(), "Polling is not activity.");
  const later = await join("AMY", "Late guest");
  assert.ok((await activity())!.getTime() > nearlyStaleTime.getTime());
  const opened = await call("/AMY/start", "POST", second.sessionToken);
  assert.equal(opened.status, 200);
  const started = await opened.json() as RoomState;
  const previous = (await activity())!.getTime();
  await sleep(Math.max(0, Date.parse(started.roundStartedAt!) - Date.now()) + 25);
  assert.equal((await call("/AMY/answer", "PUT", later.sessionToken, { round: 1, answer: "zzzzz" })).status, 200);
  assert.equal((await activity())?.getTime(), previous, "Rejected answers are not activity.");
  const accepted = await call("/AMY/answer", "PUT", later.sessionToken, { round: 1, answer: questionBank[0].catalog[0].answer });
  assert.equal(accepted.status, 200);
  const scored = await accepted.json() as RoomState;
  assert.ok(scored.submitted && scored.myTotalPoints > 0);
  assert.ok((await activity())!.getTime() > previous);
  await db.update(scoopRoomsTable).set({ lastActivityAt: staleTime })
    .where(inArray(scoopRoomsTable.id, [second.id, first.id]));
  assert.equal((await call("/AMY", "GET", guests[0].sessionToken)).status, 401);
  assert.equal((await call("/AMY")).status, 404);
  assert.equal((await call("/AMY/start", "POST", second.sessionToken)).status, 401);

  const recycledLobby = await host("Host after stale game");
  assert.equal(recycledLobby.room.code, "AMY");
  assert.equal((await state("amy")).players[0].displayName, "Host after stale game");
  assert.equal((await call("/AMY", "GET", later.sessionToken)).status, 401);
  assert.equal((await call("/DAN", "GET", early.sessionToken)).status, 401);
  for (const table of [scoopPlayersTable, scoopAnswersTable, scoopQuestionsTable])
    assert.equal((await db.select({ id: table.id }).from(table).where(eq(table.roomId, second.id))).length, 0);
  assert.equal((await db.select({ id: scoopRoomsTable.id }).from(scoopRoomsTable)
    .where(inArray(scoopRoomsTable.id, [first.id, second.id]))).length, 0);
  await db.update(scoopRoomsTable).set({ phase: "finished", round: first.room.questionCount })
    .where(eq(scoopRoomsTable.id, third.id));
  const concurrent = await Promise.all([host("Parallel host one"), host("Parallel host two")]);
  assert.deepEqual(new Set(concurrent.map(entry => entry.room.code)), new Set(["AMY", "RBF"]));
  console.log("PASS: Active sessions, one-hour inactivity, cascade deletion, safe code reuse, random fallback and concurrent creation.");
} finally {
  if (createdIds.length) await db.delete(scoopRoomsTable).where(inArray(scoopRoomsTable.id, createdIds));
  await pool.end();
}

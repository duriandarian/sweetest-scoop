/** Integration check against the local development API and database only. */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { eq, inArray, sql } from "drizzle-orm";
import { db, pool, scoopAnswersTable, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import type { FinalRecap, RoomState } from "@workspace/api-zod";
import { createSessionToken } from "../lib/room-session";

const createdIds: string[] = [];
const origin = "http://localhost:80";
const roomCode = randomBytes(3).toString("hex").toUpperCase();
function call(path: string, headers?: Record<string, string>) {
  return fetch(`${origin}/api${path}`, { headers, signal: AbortSignal.timeout(10_000) });
}
const privateRecap = (token: string) => call(`/rooms/${roomCode}/recap`, { "X-Session-Token": token });
const sharedRecap = (reference: string) => call("/results", { "X-Result-Ref": reference });

async function fixtureRoom(code: string, phase: "lobby" | "finished") {
  const [room] = await db.insert(scoopRoomsTable).values({ code, phase, round: phase === "finished" ? 7 : 0,
    lastActivityAt: sql`statement_timestamp() - interval '15 minutes'` }).returning();
  createdIds.push(room.id);
  return room;
}

try {
  const room = await fixtureRoom(roomCode, "lobby");
  const sessions = [createSessionToken(), createSessionToken(), createSessionToken()];
  const seats = await db.insert(scoopPlayersTable).values(sessions.map((session, i) => ({
    roomId: room.id, displayName: `Private name ${i}`, sessionHash: session.hash, isHost: i === 0,
  }))).returning();
  const [, guest, zeroGuest] = sessions;
  assert.equal((await call(`/rooms/${roomCode}/recap`)).status, 401);
  assert.equal((await privateRecap(sessions[0].token)).status, 403);
  assert.equal((await privateRecap(guest.token)).status, 409);
  assert.equal((await sharedRecap("not-a-reference")).status, 400);

  const questions = await db.insert(scoopQuestionsTable).values([6, 4, 0, 1, 5, 2, 3].map(position => ({
    roomId: room.id, position, prompt: `Private prompt ${position}`,
  }))).returning();
  const answers = [
    { position: 3, tier: "Coconut Cloud", basePoints: 80, speedBonus: 11 },
    { position: 0, tier: "Sago Pearl", basePoints: 20, speedBonus: 17 },
    { position: 6, tier: "Mango Cube", basePoints: 40, speedBonus: 0 },
    { position: 2, tier: "Golden Mango", basePoints: 100, speedBonus: 10 },
    { position: 4, tier: "Pomelo Gem", basePoints: 60, speedBonus: 5 },
    { position: 5, tier: "No match", basePoints: 0, speedBonus: 0 },
  ];
  await db.insert(scoopAnswersTable).values(answers.map(({ position, tier, basePoints, speedBonus }) => ({
    roomId: room.id, questionId: questions.find(q => q.position === position)!.id, playerId: seats[1].id,
    answer: "Private answer", normalizedAnswer: "private answer", tier, basePoints, speedBonus, points: basePoints + speedBonus,
  })));
  await db.update(scoopRoomsTable).set({ phase: "finished", round: questions.length }).where(eq(scoopRoomsTable.id, room.id));
  const final = await privateRecap(guest.token);
  assert.equal(final.status, 200);
  assert.equal(final.headers.get("cache-control"), "no-store");
  const { reference, recap } = await final.json() as FinalRecap;
  assert.deepEqual(recap, { totalPoints: 343, rounds: [
    "sago-pearl", "skipped", "golden-mango", "coconut-cloud", "pomelo-gem", "skipped", "mango-cube",
  ] });
  assert.notEqual(reference, guest.token);
  const snapshot = await (await call(`/rooms/${roomCode}`, { "X-Session-Token": guest.token })).json() as RoomState;
  assert.equal(snapshot.myTotalPoints, recap.totalPoints);
  const publicResponse = await sharedRecap(reference);
  assert.equal(publicResponse.status, 200);
  assert.equal(publicResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(await publicResponse.json(), recap, "A fresh viewer gets no seat, names, prompts or answers.");
  if (process.argv.includes("--browser")) {
    const { stdout } = await promisify(execFile)("chromium", [
      "--headless", "--no-sandbox", "--incognito", "--dump-dom", "--virtual-time-budget=7000",
      `${origin}/results#${reference}`,
    ], { timeout: 25_000 });
    const section = stdout.match(/<section[^>]*aria-labelledby="shared-score-title"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? "";
    assert.match(section, /data-testid="recap-points"[^>]*><strong[^>]*>343<\/strong>/);
    assert.match(section, /Round 3: Golden Mango/);
    assert.match(section, /aria-label="Topping key"/);
    assert.doesNotMatch(section, /Private name|Private prompt|Private answer/);
  }
  const forgedRef = `${reference.slice(0, 37)}${reference[37] === "A" ? "B" : "A"}${reference.slice(38)}`;
  assert.equal((await sharedRecap(forgedRef)).status, 404);
  assert.equal((await sharedRecap(`${seats[2].id}.${reference.split(".")[1]}`)).status, 404);
  const zero = await (await privateRecap(zeroGuest.token)).json() as FinalRecap;
  assert.deepEqual(zero.recap, { totalPoints: 0, rounds: Array.from({ length: questions.length }, () => "skipped") });
  assert.deepEqual(await (await sharedRecap(zero.reference)).json(), zero.recap);
  const [seen] = await db.select({ at: scoopRoomsTable.lastActivityAt }).from(scoopRoomsTable).where(eq(scoopRoomsTable.id, room.id));
  assert.equal(seen?.at?.getTime(), room.lastActivityAt?.getTime(), "Sharing and reading never extend room life.");

  // Expire only this disposable fixture, then simulate physical cleanup and code reuse.
  await db.update(scoopRoomsTable).set({ lastActivityAt: sql`statement_timestamp() - interval '2 hours'` })
    .where(eq(scoopRoomsTable.id, room.id));
  assert.equal((await sharedRecap(reference)).status, 404);
  assert.equal((await privateRecap(guest.token)).status, 401);
  await db.delete(scoopRoomsTable).where(eq(scoopRoomsTable.id, room.id));
  await fixtureRoom(roomCode, "finished");
  assert.equal((await sharedRecap(reference)).status, 404);
  process.stdout.write("Final recap verified: guest-only access, exact score, round order, zero score, independent viewer, expiry, and code reuse.\n");
} finally {
  if (createdIds.length) await db.delete(scoopRoomsTable).where(inArray(scoopRoomsTable.id, createdIds));
  await pool.end();
}

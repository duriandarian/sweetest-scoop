import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, scoopAnswersTable, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import type { RoomState } from "@workspace/api-zod";
import { questionBank, findAnswer, matchKey, ROUND_DURATION_SECONDS } from "./party-scoring";

export { normalizeAnswer } from "./party-scoring";
export const sampleQuestions = questionBank.map(q => q.prompt);
export type GameTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function createSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashSessionToken(token) };
}
export function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(6), byte => alphabet[byte % alphabet.length]).join("");
}
export async function lockRoom(tx: GameTx, id: string) {
  const [room] = await tx.select().from(scoopRoomsTable).where(eq(scoopRoomsTable.id, id)).for("update");
  return room;
}
/** Persist expiry on read, not a client-controlled reveal. Survives restarts and concurrent polls. */
export async function expireRound(roomId: string) {
  await db.transaction(async tx => {
    const room = await lockRoom(tx, roomId);
    if (room?.phase === "answering" && room.roundEndsAt && Date.now() >= room.roundEndsAt.getTime()) {
      await tx.update(scoopRoomsTable).set({ phase: "revealed" }).where(eq(scoopRoomsTable.id, roomId));
    }
  });
}
export async function getRoomState(roomId: string, code: string, sessionHash?: string): Promise<RoomState> {
  await expireRound(roomId);
  // A shared lock keeps this snapshot coherent with submissions/next/reveal.
  return db.transaction(async tx => {
    const [room] = await tx.select().from(scoopRoomsTable).where(eq(scoopRoomsTable.id, roomId)).for("share");
    if (!room) throw new Error("Room not found");
    const players = await tx.select().from(scoopPlayersTable).where(eq(scoopPlayersTable.roomId, roomId)).orderBy(asc(scoopPlayersTable.createdAt));
    const questions = await tx.select().from(scoopQuestionsTable).where(eq(scoopQuestionsTable.roomId, roomId)).orderBy(asc(scoopQuestionsTable.position));
    const mine = players.find(p => p.sessionHash === sessionHash);
    const question = questions[room.round - 1];
    const revealed = room.phase === "revealed" || room.phase === "finished";
    const rows = mine ? await tx.select().from(scoopAnswersTable).where(eq(scoopAnswersTable.roomId, roomId)) : [];
    const current = rows.filter(a => a.questionId === question?.id);
    const myAnswer = current.find(a => a.playerId === mine?.id);
    const guests = players.filter(p => !p.isHost);
    const compare = (a: { points: number; elapsedMs?: number | null; displayName: string; playerId: string }, b: typeof a) =>
      b.points - a.points || (a.elapsedMs ?? Infinity) - (b.elapsedMs ?? Infinity) || a.displayName.localeCompare(b.displayName) || a.playerId.localeCompare(b.playerId);
    const roundStandings = revealed && mine ? guests.map(p => {
      const a = current.find(a => a.playerId === p.id);
      return { playerId: p.id, displayName: p.displayName, avatar: p.avatar, points: a?.points ?? 0,
        discoveries: a?.basePoints ? 1 : 0, answer: a?.answer ?? null, basePoints: a?.basePoints ?? 0,
        speedBonus: a?.speedBonus ?? 0, elapsedMs: a?.elapsedMs ?? null };
    }).sort(compare) : [];
    const standings = mine ? guests.map(p => {
      const scored = rows.filter(a => a.playerId === p.id && (revealed || a.questionId !== question?.id));
      return { playerId: p.id, displayName: p.displayName, avatar: p.avatar,
        points: scored.reduce((s, a) => s + (a.points ?? 0), 0),
        discoveries: scored.filter(a => (a.basePoints ?? 0) > 0).length };
    }).sort(compare) : [];
    const groups = new Map<string, RoomState["answers"][number]>();
    const catalogCounts = new Map<string, number>();
    if (revealed && mine) for (const a of current) {
      const name = players.find(p => p.id === a.playerId)?.displayName ?? "Guest";
      // Stored rewards remain authoritative; do not retroactively credit old misses.
      const entry = (a.basePoints ?? 0) > 0 ? findAnswer(room.round - 1, a.answer) : undefined;
      const creditedKey = entry ? matchKey(entry.answer) : null;
      if (creditedKey) catalogCounts.set(creditedKey, (catalogCounts.get(creditedKey) ?? 0) + 1);
      const groupKey = creditedKey ? `catalog:${creditedKey}` : `raw:${a.normalizedAnswer}`;
      const group = groups.get(groupKey) ?? { answer: entry?.answer ?? a.answer, players: [], count: 0,
        points: a.basePoints ?? 0, tier: a.tier ?? "No match", ingredient: a.ingredient ?? "No prize" };
      group.players.push(name); group.count++; groups.set(groupKey, group);
    }
    return {
      code, phase: room.phase as RoomState["phase"], round: room.round, questionCount: questions.length,
      questions: questions.map(q => q.prompt), currentQuestion: question?.prompt ?? null,
      players: players.map(p => ({ id: p.id, displayName: p.displayName, isHost: p.isHost, avatar: p.avatar,
        hasAnswered: !p.isHost && current.some(a => a.playerId === p.id) })),
      answers: [...groups.values()].sort((a,b) => b.points-a.points), standings, roundStandings,
      possibleAnswers: revealed && mine ? (questionBank[room.round - 1]?.catalog ?? []).map(entry => {
        const count = catalogCounts.get(matchKey(entry.answer)) ?? 0;
        return { ...entry, submitted: count > 0, submittedCount: count };
      }) : [],
      isHost: Boolean(mine?.isHost), playerId: mine?.id ?? null, avatar: mine?.avatar ?? "mango",
      submitted: Boolean(myAnswer), submittedCount: mine ? current.length : 0, myAnswer: myAnswer?.answer ?? null,
      myTotalPoints: mine && !mine.isHost ? rows.filter(a => a.playerId === mine.id).reduce((sum, a) => sum + (a.points ?? 0), 0) : 0,
      myReward: myAnswer ? { points: myAnswer.points ?? 0, basePoints: myAnswer.basePoints ?? 0,
        speedBonus: myAnswer.speedBonus ?? 0, tier: myAnswer.tier ?? "No match", ingredient: myAnswer.ingredient ?? "No prize",
        depth: myAnswer.depth ?? 0, matched: (myAnswer.basePoints ?? 0) > 0, elapsedMs: myAnswer.elapsedMs ?? 0 } : null,
      serverNow: new Date().toISOString(), roundStartedAt: room.roundStartedAt?.toISOString() ?? null,
      roundEndsAt: room.roundEndsAt?.toISOString() ?? null, roundDuration: room.phase === "lobby" ? ROUND_DURATION_SECONDS : room.roundDuration,
    };
  });
}
export async function roomByCode(code: string) {
  const [room] = await db.select().from(scoopRoomsTable).where(eq(scoopRoomsTable.code, code.toUpperCase())).limit(1);
  return room;
}
export async function requireRoomPlayer(roomId: string, sessionToken?: string) {
  if (!sessionToken) return null;
  const [player] = await db.select().from(scoopPlayersTable).where(and(
    eq(scoopPlayersTable.roomId, roomId), eq(scoopPlayersTable.sessionHash, hashSessionToken(sessionToken)),
  )).limit(1);
  return player ?? null;
}

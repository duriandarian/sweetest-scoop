import { and, asc, eq, gt, lte, sql } from "drizzle-orm";
import { db, scoopAnswersTable, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import type { RoomState } from "@workspace/api-zod";
import { questionBank, bankForVersion, CUSTOM_BANK_VERSION, matchPreparedAnswer, matchKey, roundBank, ROUND_DURATION_SECONDS } from "./party-scoring";
import { honorableMentions } from "./honorable-mentions";
import { publicRoomCode } from "./room-codes";
import { hashSessionToken } from "./room-session";
import { activeRoom, type GameTx } from "./room-expiry";
import { partyBobiForName } from "./display-name";

export { normalizeAnswer } from "./party-scoring";
export const sampleQuestions = questionBank.map(q => q.prompt);
export function scheduleRound(now = Date.now()) {
  const start = now + 3_000;
  return {
    roundDuration: ROUND_DURATION_SECONDS,
    roundStartedAt: new Date(start),
    roundEndsAt: new Date(start + ROUND_DURATION_SECONDS * 1_000),
  };
}
export async function lockRoom(tx: GameTx, id: string) {
  const [room] = await tx.select().from(scoopRoomsTable)
    .where(and(eq(scoopRoomsTable.id, id), activeRoom())).for("update");
  return room;
}
/** Call while holding the room lock, in the same transaction as the accepted answer. */
export async function revealIfEveryoneAnswered(tx: GameTx, roomId: string, questionId: string) {
  const [counts] = await tx.select({
    guests: sql<number>`count(*)::int`,
    answered: sql<number>`count(${scoopAnswersTable.id})::int`,
  }).from(scoopPlayersTable).leftJoin(scoopAnswersTable, and(
    eq(scoopAnswersTable.playerId, scoopPlayersTable.id),
    eq(scoopAnswersTable.questionId, questionId),
    gt(scoopAnswersTable.basePoints, 0),
  )).where(and(eq(scoopPlayersTable.roomId, roomId), eq(scoopPlayersTable.isHost, false)));
  if (counts.guests > 0 && counts.guests === counts.answered) {
    await tx.update(scoopRoomsTable).set({ phase: "revealed" })
      .where(and(eq(scoopRoomsTable.id, roomId), eq(scoopRoomsTable.phase, "answering")));
  }
}
/** Atomic expiry check; an old request cannot close a newly started round. */
export async function expireRound(roomId: string) {
  await db.update(scoopRoomsTable).set({ phase: "revealed" }).where(and(
    eq(scoopRoomsTable.id, roomId), eq(scoopRoomsTable.phase, "answering"),
    lte(scoopRoomsTable.roundEndsAt, new Date()), activeRoom(),
  ));
}
export async function getRoomState(roomId: string, sessionHash?: string): Promise<RoomState | undefined> {
  // One consistent, read-only snapshot: phone refreshes never queue on the room's
  // write lock or block an answer. Submissions/host controls still serialize writes.
  const snapshot = await db.transaction(async tx => {
    const [room] = await tx.select().from(scoopRoomsTable).where(and(eq(scoopRoomsTable.id, roomId), activeRoom()));
    if (!room) return undefined;
    const custom = room.bankVersion === CUSTOM_BANK_VERSION;
    if (room.phase === "answering" && room.roundEndsAt && Date.now() >= room.roundEndsAt.getTime()) return null;
    const savedPlayers = await tx.select().from(scoopPlayersTable).where(eq(scoopPlayersTable.roomId, roomId)).orderBy(asc(scoopPlayersTable.createdAt));
    // Older seats may still have an ordinary outfit saved. Resolve the reserved
    // look before building the cup, guest view, or standings from this snapshot.
    const players = savedPlayers.map(player => {
      const partyAvatar = player.isHost ? undefined : partyBobiForName(player.displayName);
      return partyAvatar && partyAvatar !== player.avatar ? { ...player, avatar: partyAvatar } : player;
    });
    const questions = await tx.select({ id: scoopQuestionsTable.id, prompt: scoopQuestionsTable.prompt }).from(scoopQuestionsTable)
      .where(eq(scoopQuestionsTable.roomId, roomId)).orderBy(asc(scoopQuestionsTable.position));
    const mine = players.find(p => p.sessionHash === sessionHash);
    const question = questions[room.round - 1];
    const revealed = room.phase === "revealed" || room.phase === "finished";
    const rows = mine ? await tx.select().from(scoopAnswersTable).where(eq(scoopAnswersTable.roomId, roomId)) : [];
    const current = rows.filter(a => a.questionId === question?.id);
    const myAnswer = current.find(a => a.playerId === mine?.id);
    // A room poll during answering never fetches the custom catalog. Stored
    // custom answers already use the host's original label.
    const [currentCustom] = custom && revealed && mine && question
      ? await tx.select({ customAnswers: scoopQuestionsTable.customAnswers }).from(scoopQuestionsTable)
        .where(eq(scoopQuestionsTable.id, question.id)) : [];
    const currentBank = custom
      ? currentCustom && roundBank(room.bankVersion, room.round - 1, { ...question, ...currentCustom })
      : bankForVersion(room.bankVersion)?.[room.round - 1];
    // Display previously credited exact answers or aliases with the bank's current label,
    // without changing the stored answer or reward.
    const displayedAnswer = (a?: typeof current[number]) => {
      if (!a) return null;
      if (!currentBank || (a.basePoints ?? 0) <= 0) return a.answer;
      const key = matchKey(a.answer);
      return (currentBank.keyed.get(key) ?? currentBank.alternatives.get(key))?.answer ?? a.answer;
    };
    const guests = players.filter(p => !p.isHost);
    const compare = (a: { points: number; elapsedMs?: number | null; displayName: string; playerId: string }, b: typeof a) =>
      b.points - a.points || (a.elapsedMs ?? Infinity) - (b.elapsedMs ?? Infinity) || a.displayName.localeCompare(b.displayName) || a.playerId.localeCompare(b.playerId);
    const roundStandings = revealed && mine ? guests.map(p => {
      const a = current.find(a => a.playerId === p.id);
      return { playerId: p.id, displayName: p.displayName, avatar: p.avatar, points: a?.points ?? 0,
        discoveries: a?.basePoints ? 1 : 0, answer: displayedAnswer(a), basePoints: a?.basePoints ?? 0,
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
      const entry = currentBank && (a.basePoints ?? 0) > 0 ? matchPreparedAnswer(currentBank, a.answer) : undefined;
      const creditedKey = entry ? matchKey(entry.answer) : null;
      if (creditedKey) catalogCounts.set(creditedKey, (catalogCounts.get(creditedKey) ?? 0) + 1);
      const groupKey = creditedKey ? `catalog:${creditedKey}` : `raw:${a.normalizedAnswer}`;
      const group = groups.get(groupKey) ?? { answer: entry?.answer ?? a.answer, players: [], count: 0,
        points: a.basePoints ?? 0, tier: a.tier ?? "No match", ingredient: a.ingredient ?? "No prize" };
      group.players.push(name); group.count++; groups.set(groupKey, group);
    }
    return {
      code: publicRoomCode(room.code), phase: room.phase as RoomState["phase"], round: room.round, questionCount: questions.length,
      questions: (custom ? (mine ? questions.slice(0, room.round) : []) : questions).map(q => q.prompt),
      currentQuestion: !custom || mine ? question?.prompt ?? null : null,
      players: players.map(p => ({ id: p.id, displayName: p.displayName, isHost: p.isHost, avatar: p.avatar,
        hasAnswered: !p.isHost && current.some(a => a.playerId === p.id) })),
      answers: [...groups.values()].sort((a,b) => b.points-a.points), standings, roundStandings,
      ...(room.phase === "finished" && mine ? { honorableMentions: honorableMentions(guests, rows) } : {}),
      possibleAnswers: revealed && mine ? (currentBank?.catalog ?? []).map(entry => {
        const count = catalogCounts.get(matchKey(entry.answer)) ?? 0;
        return { ...entry, submitted: count > 0, submittedCount: count };
      }) : [],
      isHost: Boolean(mine?.isHost), playerId: mine?.id ?? null, avatar: mine?.avatar ?? "mango",
      ...(mine ? { roomInstanceId: room.id } : {}),
      submitted: Boolean(myAnswer), submittedCount: mine ? current.length : 0, myAnswer: displayedAnswer(myAnswer),
      myTotalPoints: mine && !mine.isHost ? rows.filter(a => a.playerId === mine.id).reduce((sum, a) => sum + (a.points ?? 0), 0) : 0,
      myReward: myAnswer ? { points: myAnswer.points ?? 0, basePoints: myAnswer.basePoints ?? 0,
        speedBonus: myAnswer.speedBonus ?? 0, tier: myAnswer.tier ?? "No match", ingredient: myAnswer.ingredient ?? "No prize",
        depth: myAnswer.depth ?? 0, matched: (myAnswer.basePoints ?? 0) > 0, elapsedMs: myAnswer.elapsedMs ?? 0 } : null,
      serverNow: new Date().toISOString(), roundStartedAt: room.roundStartedAt?.toISOString() ?? null,
      roundEndsAt: room.roundEndsAt?.toISOString() ?? null, roundDuration: room.phase === "lobby" ? ROUND_DURATION_SECONDS : room.roundDuration,
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  // Only an expired snapshot needs a write. Re-read after expiry so its public
  // phase, answers and standings all describe the same committed round.
  if (snapshot === null) {
    await expireRound(roomId);
    return getRoomState(roomId, sessionHash);
  }
  return snapshot;
}
export async function requireRoomPlayer(roomId: string, sessionToken?: string) {
  if (!sessionToken) return null;
  const [player] = await db.select().from(scoopPlayersTable).where(and(
    eq(scoopPlayersTable.roomId, roomId), eq(scoopPlayersTable.sessionHash, hashSessionToken(sessionToken)),
  )).limit(1);
  return player ?? null;
}

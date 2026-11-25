import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import {
  CreateRoomBody, CreateRoomResponse, GetRoomParams, GetRoomResponse, JoinRoomBody, JoinRoomResponse,
  UpdateQuestionsBody, SubmitAnswerBody, UpdateProfileBody, UpdateSettingsBody, NextQuestionBody,
  CheckPracticeAnswerBody, CheckPracticeAnswerResponse,
  GetFinalRecapResponse, GetSharedRecapHeader, GetSharedRecapResponse,
} from "@workspace/api-zod";
import { db, scoopAnswersTable, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import { getRoomState, lockRoom, normalizeAnswer, requireRoomPlayer,
  sampleQuestions, scheduleRound, expireRound, revealIfEveryoneAnswered } from "../lib/sweetest-scoop";
import { allocateRoomCode, roomByCode } from "../lib/room-codes";
import { createSessionToken, hashSessionToken } from "../lib/room-session";
import { activityTime, touchRoom, type GameTx } from "../lib/room-expiry";
import { answerCorrection, bankForVersion, correctionForRound, CUSTOM_BANK_VERSION, GAME_VERSION, roundBank,
  ROUND_COUNT, ROUND_DURATION_SECONDS, scoreAnswer, scoreRound } from "../lib/party-scoring";
import { displayNameKey, partyBobiForName, validateDisplayName } from "../lib/display-name";
import { loadFinalRecap } from "../lib/final-recap";

const router: IRouter = Router();
type EntryField = "name" | "code";
const fail = (res: Response, status: number, error: string, field?: EntryField) => {
  res.status(status).json(field ? { error, field } : { error });
};
async function access(req: Request, res: Response, host = false) {
  const parsed = GetRoomParams.safeParse(req.params);
  if (!parsed.success) { fail(res, 400, "Invalid room code."); return null; }
  const room = await roomByCode(parsed.data.code, req.get("X-Session-Token"));
  if (!room) missingRoom(req);
  const player = await requireRoomPlayer(room.id, req.get("X-Session-Token"));
  if (!player) { fail(res, 401, "Join this room to continue."); return null; }
  if (host && !player.isHost) { fail(res, 403, "Only the host can do that."); return null; }
  return { room, player };
}
async function state(req: Request, room: { id: string }) {
  const token = req.get("X-Session-Token");
  const snapshot = await getRoomState(room.id, token ? hashSessionToken(token) : undefined);
  if (!snapshot) missingRoom(req);
  return GetRoomResponse.parse(snapshot);
}
class RuleError extends Error {
  constructor(public status: number, message: string, public field?: EntryField) { super(message); }
}
function missingRoom(req: Request): never {
  if (req.get("X-Session-Token")) throw new RuleError(401, "This room is no longer available. Join a current game.");
  throw new RuleError(404, "Room not found. Check the code.", "code");
}
async function lockActiveRoom(tx: GameTx, id: string, req: Request) {
  const room = await lockRoom(tx, id);
  if (!room) missingRoom(req);
  return room;
}
// Express forwards other errors to the app error handler; expected game conflicts remain actionable.
const safe = (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
  try { await handler(req, res); } catch (e) { if (e instanceof RuleError) fail(res, e.status, e.message, e.field); else throw e; }
};

router.post("/practice/answer", safe(async (req, res) => {
  const body = CheckPracticeAnswerBody.safeParse(req.body);
  if (!body.success || body.data.round > ROUND_COUNT || !normalizeAnswer(body.data.answer)) {
    fail(res, 400, "Enter an answer for a valid practice question."); return;
  }
  // Practice is unranked: elapsed time is illustrative, never persisted in a room.
  const correction = answerCorrection(body.data.round - 1, body.data.answer);
  const reward = correction
    ? { ...scoreAnswer(body.data.round - 1, "", body.data.elapsedMs, ROUND_DURATION_SECONDS * 1000), answerCorrection: correction }
    : scoreAnswer(body.data.round - 1, body.data.answer, body.data.elapsedMs, ROUND_DURATION_SECONDS * 1000);
  res.json(CheckPracticeAnswerResponse.parse(reward));
}));

router.post("/rooms", safe(async (req, res) => {
  // Reject old clients explicitly rather than silently creating the party game
  // when a host thought they were importing a different question bank.
  if (req.body && Object.hasOwn(req.body, "customQuestionsTsv")) {
    fail(res, 400, "Custom games are not available. Refresh and create a party room."); return;
  }
  const name = validateDisplayName(req.body?.hostName);
  if ("error" in name) { fail(res, 400, name.error, "name"); return; }
  const body = CreateRoomBody.safeParse(req.body);
  if (!body.success) { fail(res, 400, "Choose a valid Bobi outfit combination."); return; }
  const session = createSessionToken();
  const result = await db.transaction(async tx => {
    const code = await allocateRoomCode(tx);
    if (!code) throw new RuleError(503, "All room codes are in use. Finish an existing game or try again later.");
    const [room] = await tx.insert(scoopRoomsTable).values({ code, bankVersion: GAME_VERSION,
      roundDuration: ROUND_DURATION_SECONDS, createdAt: activityTime(), lastActivityAt: activityTime() }).returning();
    await tx.insert(scoopPlayersTable).values({ roomId: room.id, displayName: name.name,
      isHost: true, sessionHash: session.hash, avatar: body.data.avatar ?? "mango" });
    await tx.insert(scoopQuestionsTable).values(sampleQuestions.map((prompt, position) => ({ prompt, roomId: room.id, position })));
    return room;
  });
  res.status(201).json(CreateRoomResponse.parse({ sessionToken: session.token, room: await getRoomState(result.id, session.hash) }));
}));

router.get("/rooms/:code", safe(async (req, res) => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) { fail(res, 400, "Invalid room code."); return; }
  const room = await roomByCode(params.data.code, req.get("X-Session-Token"));
  if (!room) missingRoom(req);
  const snapshot = await state(req, room);
  // The snapshot already resolves the session against the room roster. Do not
  // repeat that database lookup for every phone poll.
  if (req.get("X-Session-Token") && !snapshot.playerId) {
    fail(res, 401, "Your room session could not be verified. Rejoin the lobby."); return;
  }
  res.json(snapshot);
}));

router.post("/rooms/:code/players", safe(async (req, res) => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) { fail(res, 400, "Enter the room code shown on the host screen.", "code"); return; }
  const name = validateDisplayName(req.body?.displayName);
  if ("error" in name) { fail(res, 400, name.error, "name"); return; }
  const body = JoinRoomBody.safeParse(req.body);
  if (!body.success) {
    if (body.error.issues.some(issue => issue.path[0] === "inviteRoomId")) {
      fail(res, 400, "This invite link is incomplete. Scan again or type the latest room code.", "code"); return;
    }
    fail(res, 400, "Choose a valid Bobi outfit combination."); return;
  }
  const inviteRoomId = body.data.inviteRoomId?.toLowerCase();
  const unavailable = inviteRoomId
    ? "This invite has expired. Scan the latest QR code on the host screen."
    : "Room not found. Check the code on the host screen.";
  const room = await roomByCode(params.data.code);
  if (!room || (inviteRoomId && room.id !== inviteRoomId)) {
    fail(res, 404, unavailable, "code"); return;
  }
  const session = createSessionToken();
  await db.transaction(async tx => {
    const locked = await lockRoom(tx, room.id);
    if (!locked || locked.code !== params.data.code.toUpperCase())
      throw new RuleError(404, unavailable, "code");
    if (locked.phase !== "lobby") throw new RuleError(409, "This game has started. Ask the host for the next room.");
    // Check under the same room lock as the insert, so two simultaneous joins
    // cannot both take one name. Compare older saved names without rewriting them.
    const roster = await tx.select({ name: scoopPlayersTable.displayName }).from(scoopPlayersTable).where(eq(scoopPlayersTable.roomId, room.id));
    const key = displayNameKey(name.name);
    if (roster.some(player => displayNameKey(player.name) === key))
      throw new RuleError(409, "That name is already in this room. Try adding an initial or nickname.", "name");
    await tx.insert(scoopPlayersTable).values({ roomId: room.id, displayName: name.name,
      sessionHash: session.hash, avatar: partyBobiForName(name.name) ?? body.data.avatar ?? "mango" });
    await touchRoom(tx, room.id);
  });
  res.status(201).json(JoinRoomResponse.parse({ sessionToken: session.token, room: await getRoomState(room.id, session.hash) }));
}));

router.put("/rooms/:code/profile", safe(async (req, res) => {
  const a = await access(req, res); if (!a) return;
  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) { fail(res, 400, "Choose a valid Bobi outfit combination."); return; }
  await db.transaction(async tx => {
    const room = await lockActiveRoom(tx, a.room.id, req);
    if (room.phase !== "lobby") throw new RuleError(409, "Bobi styles are locked once the game starts.");
    if (!a.player.isHost && partyBobiForName(a.player.displayName))
      throw new RuleError(409, "This party outfit is locked to your seat.");
    await tx.update(scoopPlayersTable).set({ avatar: body.data.avatar }).where(eq(scoopPlayersTable.id, a.player.id));
    await touchRoom(tx, room.id);
  });
  res.json(await state(req, a.room));
}));

router.put("/rooms/:code/settings", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) { fail(res, 400, "Each round is 25 seconds."); return; }
  await db.transaction(async tx => {
    const room = await lockActiveRoom(tx, a.room.id, req);
    if (room.phase !== "lobby") throw new RuleError(409, "Round duration is locked after starting.");
    await tx.update(scoopRoomsTable).set({ roundDuration: body.data.roundDuration, lastActivityAt: activityTime() })
      .where(eq(scoopRoomsTable.id, room.id));
  });
  res.json(await state(req, a.room));
}));

router.put("/rooms/:code/questions", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  const body = UpdateQuestionsBody.safeParse(req.body);
  if (!body.success) { fail(res, 400, "Send a complete set of question prompts."); return; }
  await db.transaction(async tx => {
    const room = await lockActiveRoom(tx, a.room.id, req);
    if (room.phase !== "lobby") throw new RuleError(409, "Questions are locked after starting.");
    if (room.bankVersion === CUSTOM_BANK_VERSION) throw new RuleError(409, "Create another custom room to change the questions.");
    const bank = bankForVersion(room.bankVersion);
    if (!bank) throw new RuleError(409, "Create a new room to use the current questions.");
    if (body.data.questions.length !== bank.length) throw new RuleError(400, `Exactly ${bank.length} prompts are required for this room.`);
    // Prompts may be reworded, but positions continue to use the corresponding spreadsheet answer bank.
    for (let i = 0; i < bank.length; i++) {
      if (!body.data.questions[i].trim()) throw new RuleError(400, "Prompts cannot be blank.");
      await tx.update(scoopQuestionsTable).set({ prompt: body.data.questions[i].trim() })
        .where(and(eq(scoopQuestionsTable.roomId, room.id), eq(scoopQuestionsTable.position, i)));
    }
    await touchRoom(tx, room.id);
  });
  res.json(await state(req, a.room));
}));

router.post("/rooms/:code/start", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  await db.transaction(async tx => {
    const room = await lockActiveRoom(tx, a.room.id, req);
    if (room.phase !== "lobby") return; // A retry reads the room without restarting its timer.
    if (room.bankVersion !== CUSTOM_BANK_VERSION && !bankForVersion(room.bankVersion))
      throw new RuleError(409, "This is an older game room. Create a new room for the current questions.");
    const guests = await tx.select().from(scoopPlayersTable).where(and(eq(scoopPlayersTable.roomId, room.id), eq(scoopPlayersTable.isHost, false)));
    if (!guests.length) throw new RuleError(409, "At least one guest must join before starting.");
    await tx.update(scoopRoomsTable).set({ phase: "answering", round: 1, ...scheduleRound(), lastActivityAt: activityTime() })
      .where(eq(scoopRoomsTable.id, room.id));
  });
  res.json(await state(req, a.room));
}));

router.put("/rooms/:code/answer", safe(async (req, res) => {
  const receivedAt = Date.now();
  const a = await access(req, res); if (!a) return;
  const body = SubmitAnswerBody.safeParse(req.body);
  if (!body.success || !normalizeAnswer(body.data.answer)) { fail(res, 400, "Type an answer before submitting."); return; }
  if (a.player.isHost) { fail(res, 403, "The host moderates; guests submit answers."); return; }
  // Commit the expiry even when the following submission is rejected.
  await expireRound(a.room.id);
  const feedback = await db.transaction(async tx => {
    const room = await lockActiveRoom(tx, a.room.id, req);
    const now = Date.now();
    if (room.phase !== "answering" || !room.roundEndsAt || !room.roundStartedAt || now >= room.roundEndsAt.getTime())
      throw new RuleError(409, "Time is up. Answers are closed.");
    if (body.data.round !== room.round) throw new RuleError(409, "That answer belongs to a previous round. Refresh the current question.");
    if (receivedAt < room.roundStartedAt.getTime()) throw new RuleError(409, "Get ready. This round hasn't started yet.");
    const [question] = await tx.select().from(scoopQuestionsTable).where(and(eq(scoopQuestionsTable.roomId, room.id),
      eq(scoopQuestionsTable.position, room.round - 1))).limit(1);
    if (!question) throw new RuleError(409, "Question not found.");
    const [existing] = await tx.select({ id: scoopAnswersTable.id }).from(scoopAnswersTable)
      .where(and(eq(scoopAnswersTable.questionId, question.id), eq(scoopAnswersTable.playerId, a.player.id))).limit(1);
    if (existing) throw new RuleError(409, "Your first answer is already locked for this round.");
    const bank = roundBank(room.bankVersion, room.round - 1, question);
    if (!bank) throw new RuleError(409, "This room's answer bank is no longer available.");
    const correction = correctionForRound(bank, body.data.answer);
    if (correction) return { answerCorrection: correction };
    const reward = scoreRound(bank, body.data.answer, now - room.roundStartedAt.getTime(), room.roundDuration * 1000);
    if (!reward.matched) return { answerFeedback: "Not on this question's menu. Try another answer." };
    const [saved] = await tx.insert(scoopAnswersTable).values({
      roomId: room.id, questionId: question.id, playerId: a.player.id,
      answer: reward.canonicalAnswer!, normalizedAnswer: normalizeAnswer(reward.canonicalAnswer!), ...reward,
    }).onConflictDoNothing().returning({ id: scoopAnswersTable.id });
    if (!saved) throw new RuleError(409, "Your first answer is already locked for this round.");
    await revealIfEveryoneAnswered(tx, room.id, question.id);
    await touchRoom(tx, room.id);
    return {};
  });
  res.json(GetRoomResponse.parse({ ...await state(req, a.room), ...feedback }));
}));

router.post("/rooms/:code/reveal", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  await expireRound(a.room.id);
  const snapshot = await state(req, a.room);
  if (snapshot.phase !== "revealed") { fail(res, 409, "Results open when everyone has answered or the timer expires."); return; }
  res.json(snapshot);
}));

router.post("/rooms/:code/next", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  const body = NextQuestionBody.safeParse(req.body);
  if (!body.success) { fail(res, 400, "Send the round shown on the results screen."); return; }
  const { round: expectedRound } = body.data;
  await db.transaction(async tx => {
    const room = await lockActiveRoom(tx, a.room.id, req);
    // Check under the lock: a delayed duplicate can land after the following
    // question has already revealed. Only the results it came from can advance.
    if (expectedRound < room.round || (expectedRound === room.round && room.phase === "finished")) return;
    if (expectedRound !== room.round || room.phase !== "revealed")
      throw new RuleError(409, "Wait for that round's results before moving on.");
    const [nextCustomQuestion] = room.bankVersion === CUSTOM_BANK_VERSION
      ? await tx.select({ id: scoopQuestionsTable.id }).from(scoopQuestionsTable).where(and(
        eq(scoopQuestionsTable.roomId, room.id), eq(scoopQuestionsTable.position, room.round))) : [];
    const bank = bankForVersion(room.bankVersion);
    if (room.bankVersion !== CUSTOM_BANK_VERSION && !bank) throw new RuleError(409, "This room's answer bank is no longer available.");
    const done = bank ? room.round >= bank.length : !nextCustomQuestion;
    await tx.update(scoopRoomsTable).set({ ...(done ? { phase: "finished" }
      : { phase: "answering", round: room.round + 1, ...scheduleRound() }), lastActivityAt: activityTime() })
      .where(eq(scoopRoomsTable.id, room.id));
  });
  res.json(await state(req, a.room));
}));

router.get("/rooms/:code/recap", safe(async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!req.get("X-Session-Token")) { fail(res, 401, "Join this room to continue."); return; }
  const a = await access(req, res); if (!a) return;
  if (a.player.isHost) { fail(res, 403, "Only guests have a personal recap."); return; }
  if (a.room.phase !== "finished") { fail(res, 409, "Your recap opens when the game finishes."); return; }
  const result = await loadFinalRecap({ seat: {
    playerId: a.player.id, roomId: a.room.id, sessionHash: a.player.sessionHash,
  } });
  if (!result) missingRoom(req);
  res.json(GetFinalRecapResponse.parse(result));
}));

router.get("/results", safe(async (req, res) => {
  res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
  const header = GetSharedRecapHeader.safeParse({ "X-Result-Ref": req.get("X-Result-Ref") });
  if (!header.success) { fail(res, 400, "This results link is incomplete."); return; }
  const result = await loadFinalRecap({ reference: header.data["X-Result-Ref"] });
  if (!result) { fail(res, 404, "This results link has expired or is no longer available."); return; }
  res.json(GetSharedRecapResponse.parse(result.recap));
}));
export default router;

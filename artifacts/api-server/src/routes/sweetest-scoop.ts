import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import {
  CreateRoomBody, CreateRoomResponse, GetRoomParams, GetRoomResponse, JoinRoomBody, JoinRoomResponse,
  UpdateQuestionsBody, SubmitAnswerBody, UpdateProfileBody, UpdateSettingsBody,
} from "@workspace/api-zod";
import { db, scoopAnswersTable, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import { createSessionToken, getRoomState, hashSessionToken, lockRoom, normalizeAnswer, requireRoomPlayer,
  roomByCode, roomCode, sampleQuestions, expireRound } from "../lib/sweetest-scoop";
import { GAME_VERSION, ROUND_COUNT, ROUND_DURATION_SECONDS, scoreAnswer } from "../lib/party-scoring";

const router: IRouter = Router();
const fail = (res: Response, status: number, error: string) => { res.status(status).json({ error }); };
async function access(req: Request, res: Response, host = false) {
  const parsed = GetRoomParams.safeParse(req.params);
  if (!parsed.success) { fail(res, 400, "Invalid room code."); return null; }
  const room = await roomByCode(parsed.data.code);
  if (!room) { fail(res, 404, "Room not found. Check the code."); return null; }
  const player = await requireRoomPlayer(room.id, req.get("X-Session-Token"));
  if (!player) { fail(res, 401, "Join this room to continue."); return null; }
  if (host && !player.isHost) { fail(res, 403, "Only the host can do that."); return null; }
  return { room, player };
}
async function state(req: Request, room: { id: string; code: string }) {
  const token = req.get("X-Session-Token");
  return GetRoomResponse.parse(await getRoomState(room.id, room.code, token ? hashSessionToken(token) : undefined));
}
class RuleError extends Error { constructor(public status: number, message: string) { super(message); } }
// Express forwards other errors to the app error handler; expected game conflicts remain actionable.
const safe = (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
  try { await handler(req, res); } catch (e) { if (e instanceof RuleError) fail(res, e.status, e.message); else throw e; }
};

router.post("/rooms", safe(async (req, res) => {
  const body = CreateRoomBody.safeParse(req.body);
  if (!body.success || !body.data.hostName.trim()) { fail(res, 400, "Add a display name."); return; }
  const session = createSessionToken();
  let result: { id: string; code: string } | undefined;
  for (let attempt = 0; attempt < 5 && !result; attempt++) {
    result = await db.transaction(async tx => {
      const [room] = await tx.insert(scoopRoomsTable).values({ code: roomCode(), bankVersion: GAME_VERSION, roundDuration: ROUND_DURATION_SECONDS }).onConflictDoNothing().returning();
      if (!room) return undefined;
      await tx.insert(scoopPlayersTable).values({ roomId: room.id, displayName: body.data.hostName.trim(),
        isHost: true, sessionHash: session.hash, avatar: body.data.avatar ?? "mango" });
      await tx.insert(scoopQuestionsTable).values(sampleQuestions.map((prompt, position) => ({ roomId: room.id, prompt, position })));
      return room;
    });
  }
  if (!result) { fail(res, 503, "Could not generate a room code. Try again."); return; }
  res.status(201).json(CreateRoomResponse.parse({ sessionToken: session.token, room: await getRoomState(result.id, result.code, session.hash) }));
}));

router.get("/rooms/:code", safe(async (req, res) => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) { fail(res, 400, "Invalid room code."); return; }
  const room = await roomByCode(params.data.code);
  if (!room) { fail(res, 404, "Room not found. Check the code."); return; }
  if (req.get("X-Session-Token") && !(await requireRoomPlayer(room.id, req.get("X-Session-Token")))) {
    fail(res, 401, "Your room session could not be verified. Rejoin the lobby."); return;
  }
  res.json(await state(req, room));
}));

router.post("/rooms/:code/players", safe(async (req, res) => {
  const params = GetRoomParams.safeParse(req.params), body = JoinRoomBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.displayName.trim()) { fail(res, 400, "Enter your display name."); return; }
  const room = await roomByCode(params.data.code);
  if (!room) { fail(res, 404, "Room not found."); return; }
  const session = createSessionToken();
  await db.transaction(async tx => {
    const locked = await lockRoom(tx, room.id);
    if (locked.phase !== "lobby") throw new RuleError(409, "This game has started. Ask the host for the next room.");
    await tx.insert(scoopPlayersTable).values({ roomId: room.id, displayName: body.data.displayName.trim(),
      sessionHash: session.hash, avatar: body.data.avatar ?? "mango" });
  });
  res.status(201).json(JoinRoomResponse.parse({ sessionToken: session.token, room: await getRoomState(room.id, room.code, session.hash) }));
}));

router.put("/rooms/:code/profile", safe(async (req, res) => {
  const a = await access(req, res); if (!a) return;
  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) { fail(res, 400, "Choose a valid Bobi outfit combination."); return; }
  await db.transaction(async tx => {
    const room = await lockRoom(tx, a.room.id);
    if (room.phase !== "lobby") throw new RuleError(409, "Bobi styles are locked once the game starts.");
    await tx.update(scoopPlayersTable).set({ avatar: body.data.avatar }).where(eq(scoopPlayersTable.id, a.player.id));
  });
  res.json(await state(req, a.room));
}));

router.put("/rooms/:code/settings", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) { fail(res, 400, "Each round is 25 seconds."); return; }
  await db.transaction(async tx => {
    const room = await lockRoom(tx, a.room.id);
    if (room.phase !== "lobby") throw new RuleError(409, "Round duration is locked after starting.");
    await tx.update(scoopRoomsTable).set({ roundDuration: body.data.roundDuration }).where(eq(scoopRoomsTable.id, room.id));
  });
  res.json(await state(req, a.room));
}));

router.put("/rooms/:code/questions", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  const body = UpdateQuestionsBody.safeParse(req.body);
  if (!body.success) { fail(res, 400, "Exactly seven prompts are required."); return; }
  await db.transaction(async tx => {
    const room = await lockRoom(tx, a.room.id);
    if (room.phase !== "lobby") throw new RuleError(409, "Questions are locked after starting.");
    // Prompts may be reworded, but positions continue to use the corresponding spreadsheet answer bank.
    for (let i = 0; i < ROUND_COUNT; i++) {
      if (!body.data.questions[i].trim()) throw new RuleError(400, "Prompts cannot be blank.");
      await tx.update(scoopQuestionsTable).set({ prompt: body.data.questions[i].trim() })
        .where(and(eq(scoopQuestionsTable.roomId, room.id), eq(scoopQuestionsTable.position, i)));
    }
  });
  res.json(await state(req, a.room));
}));

router.post("/rooms/:code/start", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  await db.transaction(async tx => {
    const room = await lockRoom(tx, a.room.id);
    if (room.bankVersion !== GAME_VERSION) throw new RuleError(409, "This is an older game room. Create a new room for the seven-round game.");
    if (room.phase !== "lobby") throw new RuleError(409, "This game has already started.");
    const guests = await tx.select().from(scoopPlayersTable).where(and(eq(scoopPlayersTable.roomId, room.id), eq(scoopPlayersTable.isHost, false)));
    if (!guests.length) throw new RuleError(409, "At least one guest must join before starting.");
    const now = new Date();
    await tx.update(scoopRoomsTable).set({ phase: "answering", round: 1, roundDuration: ROUND_DURATION_SECONDS,
      roundStartedAt: now, roundEndsAt: new Date(now.getTime() + ROUND_DURATION_SECONDS * 1000) }).where(eq(scoopRoomsTable.id, room.id));
  });
  res.json(await state(req, a.room));
}));

router.put("/rooms/:code/answer", safe(async (req, res) => {
  const a = await access(req, res); if (!a) return;
  const body = SubmitAnswerBody.safeParse(req.body);
  if (!body.success || !normalizeAnswer(body.data.answer)) { fail(res, 400, "Type an answer before submitting."); return; }
  if (a.player.isHost) { fail(res, 403, "The host moderates; guests submit answers."); return; }
  // Commit the expiry even when the following submission is rejected.
  await expireRound(a.room.id);
  await db.transaction(async tx => {
    const room = await lockRoom(tx, a.room.id);
    const now = Date.now();
    if (room.phase !== "answering" || !room.roundEndsAt || !room.roundStartedAt || now >= room.roundEndsAt.getTime())
      throw new RuleError(409, "Time is up. Answers are closed.");
    if (body.data.round !== room.round) throw new RuleError(409, "That answer belongs to a previous round. Refresh the current question.");
    const [question] = await tx.select().from(scoopQuestionsTable).where(and(eq(scoopQuestionsTable.roomId, room.id),
      eq(scoopQuestionsTable.position, room.round - 1))).limit(1);
    if (!question) throw new RuleError(409, "Question not found.");
    const reward = scoreAnswer(room.round - 1, body.data.answer, now - room.roundStartedAt.getTime(), room.roundDuration * 1000);
    const [saved] = await tx.insert(scoopAnswersTable).values({
      roomId: room.id, questionId: question.id, playerId: a.player.id,
      answer: body.data.answer.trim().replace(/\s+/g, " "), normalizedAnswer: normalizeAnswer(body.data.answer), ...reward,
    }).onConflictDoNothing().returning({ id: scoopAnswersTable.id });
    if (!saved) throw new RuleError(409, "Your first answer is already locked for this round.");
  });
  res.json(await state(req, a.room));
}));

router.post("/rooms/:code/reveal", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  await expireRound(a.room.id);
  const room = await roomByCode(a.room.code);
  if (room?.phase !== "revealed") { fail(res, 409, "Results open automatically when the timer expires."); return; }
  res.json(await state(req, a.room));
}));

router.post("/rooms/:code/next", safe(async (req, res) => {
  const a = await access(req, res, true); if (!a) return;
  await db.transaction(async tx => {
    const room = await lockRoom(tx, a.room.id);
    if (room.phase !== "revealed") throw new RuleError(409, "Wait for the current round to end.");
    const now = new Date(), done = room.round >= ROUND_COUNT;
    await tx.update(scoopRoomsTable).set({ phase: done ? "finished" : "answering", roundDuration: done ? room.roundDuration : ROUND_DURATION_SECONDS,
      round: done ? ROUND_COUNT : room.round + 1, roundStartedAt: done ? room.roundStartedAt : now,
      roundEndsAt: done ? room.roundEndsAt : new Date(now.getTime() + ROUND_DURATION_SECONDS * 1000) }).where(eq(scoopRoomsTable.id, room.id));
  });
  res.json(await state(req, a.room));
}));
export default router;

import { Router, type IRouter, type Response } from "express";
import { and, eq } from "drizzle-orm";
import {
  CreateRoomBody,
  CreateRoomResponse,
  GetRoomHeader,
  GetRoomParams,
  GetRoomResponse,
  JoinRoomBody,
  JoinRoomParams,
  JoinRoomResponse,
  NextQuestionHeader,
  NextQuestionParams,
  NextQuestionResponse,
  RevealAnswersHeader,
  RevealAnswersParams,
  RevealAnswersResponse,
  StartGameHeader,
  StartGameParams,
  StartGameResponse,
  SubmitAnswerBody,
  SubmitAnswerHeader,
  SubmitAnswerParams,
  SubmitAnswerResponse,
  UpdateQuestionsBody,
  UpdateQuestionsHeader,
  UpdateQuestionsParams,
  UpdateQuestionsResponse,
} from "@workspace/api-zod";
import {
  db,
  scoopAnswersTable,
  scoopPlayersTable,
  scoopQuestionsTable,
  scoopRoomsTable,
} from "@workspace/db";
import {
  createSessionToken,
  getReward,
  getRoomState,
  hashSessionToken,
  normalizeAnswer,
  requireRoomPlayer,
  roomByCode,
  roomCode,
  sampleQuestions,
} from "../lib/sweetest-scoop";

const router: IRouter = Router();

function requestHeader(schema: typeof GetRoomHeader, token: string | undefined) {
  return schema.safeParse({ "X-Session-Token": token });
}

function nameIsValid(value: string): boolean {
  return value.trim().length > 0 && value.trim().length <= 32;
}

function sendInputError(res: Response, message: string) {
  res.status(400).json({ error: message });
}

async function hostFor(
  roomId: string,
  token: string | undefined,
  res: Response,
) {
  const player = await requireRoomPlayer(roomId, token);
  if (!player) {
    res.status(401).json({ error: "Join this room to continue." });
    return null;
  }
  if (!player.isHost) {
    res.status(403).json({ error: "Only the host can do that." });
    return null;
  }
  return player;
}

async function sessionTokenFor(
  roomId: string,
  token: string | undefined,
  res: Response,
) {
  const player = await requireRoomPlayer(roomId, token);
  if (!player) {
    res.status(401).json({ error: "Your room session could not be verified." });
    return null;
  }
  return player;
}

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    sendInputError(res, "Add a display name to create a room.");
    return;
  }
  if (!nameIsValid(parsed.data.hostName)) {
    sendInputError(res, "Add a display name to create a room.");
    return;
  }
  const displayName = parsed.data.hostName.trim();
  let room: typeof scoopRoomsTable.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !room; attempt += 1) {
    const [created] = await db
      .insert(scoopRoomsTable)
      .values({ code: roomCode() })
      .onConflictDoNothing()
      .returning();
    room = created;
  }
  if (!room) {
    res.status(503).json({ error: "A room code could not be generated. Try again." });
    return;
  }
  const session = createSessionToken();
  const [host] = await db
    .insert(scoopPlayersTable)
    .values({
      roomId: room.id,
      displayName,
      isHost: true,
      sessionHash: session.hash,
    })
    .returning();
  await db.insert(scoopQuestionsTable).values(
    sampleQuestions.map((prompt, position) => ({
      roomId: room.id,
      prompt,
      position,
    })),
  );
  const state = await getRoomState(room.id, room.code, host.sessionHash);
  res.status(201).json(CreateRoomResponse.parse({ sessionToken: session.token, room: state }));
});

router.get("/rooms/:code", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  const header = requestHeader(GetRoomHeader, req.get("X-Session-Token"));
  if (!params.success || !header.success) {
    sendInputError(res, "Invalid room code.");
    return;
  }
  const room = await roomByCode(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found. Check the code and try again." });
    return;
  }
  const token = header.data["X-Session-Token"];
  const player = await requireRoomPlayer(room.id, token);
  const state = await getRoomState(
    room.id,
    room.code,
    player ? hashSessionToken(token!) : undefined,
  );
  res.json(GetRoomResponse.parse(state));
});

router.post("/rooms/:code/players", async (req, res): Promise<void> => {
  const params = JoinRoomParams.safeParse(req.params);
  const parsed = JoinRoomBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    sendInputError(res, "Enter a display name to join.");
    return;
  }
  if (!nameIsValid(parsed.data.displayName)) {
    sendInputError(res, "Enter a display name to join.");
    return;
  }
  const room = await roomByCode(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found. Check the code and try again." });
    return;
  }
  const displayName = parsed.data.displayName.trim();
  const session = createSessionToken();
  const [player] = await db
    .insert(scoopPlayersTable)
    .values({
      roomId: room.id,
      displayName,
      sessionHash: session.hash,
    })
    .returning();
  const state = await getRoomState(room.id, room.code, player.sessionHash);
  res.status(201).json(JoinRoomResponse.parse({ sessionToken: session.token, room: state }));
});

router.put("/rooms/:code/questions", async (req, res): Promise<void> => {
  const params = UpdateQuestionsParams.safeParse(req.params);
  const header = requestHeader(UpdateQuestionsHeader, req.get("X-Session-Token"));
  const body = UpdateQuestionsBody.safeParse(req.body);
  if (!params.success || !header.success || !body.success) {
    sendInputError(res, "Add exactly 10 questions before saving.");
    return;
  }
  const room = await roomByCode(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return;
  }
  const host = await hostFor(
    room.id,
    header.data["X-Session-Token"],
    res,
  );
  if (!host) return;
  if (room.phase !== "lobby") {
    res.status(409).json({ error: "Questions can only be edited before the game starts." });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.delete(scoopQuestionsTable).where(eq(scoopQuestionsTable.roomId, room.id));
    await tx.insert(scoopQuestionsTable).values(
      body.data.questions.map((prompt, position) => ({
        roomId: room.id,
        prompt: prompt.trim(),
        position,
      })),
    );
  });
  res.json(
    UpdateQuestionsResponse.parse(
      await getRoomState(room.id, room.code, hashSessionToken(header.data["X-Session-Token"]!)),
    ),
  );
});

router.post("/rooms/:code/start", async (req, res): Promise<void> => {
  const params = StartGameParams.safeParse(req.params);
  const header = requestHeader(StartGameHeader, req.get("X-Session-Token"));
  if (!params.success || !header.success) {
    sendInputError(res, "Invalid room code.");
    return;
  }
  const room = await roomByCode(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return;
  }
  const host = await hostFor(room.id, header.data["X-Session-Token"], res);
  if (!host) return;
  const questions = await db
    .select()
    .from(scoopQuestionsTable)
    .where(eq(scoopQuestionsTable.roomId, room.id));
  if (room.phase !== "lobby" || questions.length !== 10) {
    res.status(409).json({ error: "The room needs exactly 10 questions and must still be in the lobby." });
    return;
  }
  await db
    .update(scoopRoomsTable)
    .set({ phase: "answering", round: 1 })
    .where(eq(scoopRoomsTable.id, room.id));
  res.json(
    StartGameResponse.parse(
      await getRoomState(room.id, room.code, hashSessionToken(header.data["X-Session-Token"]!)),
    ),
  );
});

router.put("/rooms/:code/answer", async (req, res): Promise<void> => {
  const params = SubmitAnswerParams.safeParse(req.params);
  const header = requestHeader(SubmitAnswerHeader, req.get("X-Session-Token"));
  const body = SubmitAnswerBody.safeParse(req.body);
  if (!params.success || !header.success || !body.success) {
    sendInputError(res, "Type an answer before submitting.");
    return;
  }
  if (!normalizeAnswer(body.data.answer)) {
    sendInputError(res, "Type an answer before submitting.");
    return;
  }
  const room = await roomByCode(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return;
  }
  const player = await sessionTokenFor(room.id, header.data["X-Session-Token"], res);
  if (!player) return;
  if (player.isHost) {
    res.status(403).json({ error: "The host does not submit a player answer." });
    return;
  }
  if (room.phase !== "answering") {
    res.status(409).json({ error: "Answers are not open right now." });
    return;
  }
  const [question] = await db
    .select()
    .from(scoopQuestionsTable)
    .where(
      and(
        eq(scoopQuestionsTable.roomId, room.id),
        eq(scoopQuestionsTable.position, room.round - 1),
      ),
    )
    .limit(1);
  if (!question) {
    res.status(409).json({ error: "The current question could not be found." });
    return;
  }
  const answer = body.data.answer.trim().replace(/\s+/g, " ");
  await db
    .insert(scoopAnswersTable)
    .values({
      roomId: room.id,
      questionId: question.id,
      playerId: player.id,
      answer,
      normalizedAnswer: normalizeAnswer(answer),
    })
    .onConflictDoUpdate({
      target: [scoopAnswersTable.questionId, scoopAnswersTable.playerId],
      set: {
        answer,
        normalizedAnswer: normalizeAnswer(answer),
        points: null,
        tier: null,
        ingredient: null,
      },
    });
  res.json(
    SubmitAnswerResponse.parse(
      await getRoomState(room.id, room.code, hashSessionToken(header.data["X-Session-Token"]!)),
    ),
  );
});

router.post("/rooms/:code/reveal", async (req, res): Promise<void> => {
  const params = RevealAnswersParams.safeParse(req.params);
  const header = requestHeader(RevealAnswersHeader, req.get("X-Session-Token"));
  if (!params.success || !header.success) {
    sendInputError(res, "Invalid room code.");
    return;
  }
  const room = await roomByCode(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return;
  }
  const host = await hostFor(room.id, header.data["X-Session-Token"], res);
  if (!host) return;
  if (room.phase !== "answering") {
    res.status(409).json({ error: "There are no hidden answers to reveal." });
    return;
  }
  const [question] = await db
    .select()
    .from(scoopQuestionsTable)
    .where(
      and(
        eq(scoopQuestionsTable.roomId, room.id),
        eq(scoopQuestionsTable.position, room.round - 1),
      ),
    )
    .limit(1);
  if (!question) {
    res.status(409).json({ error: "The current question could not be found." });
    return;
  }
  await db.transaction(async (tx) => {
    const answers = await tx
      .select({
        id: scoopAnswersTable.id,
        normalizedAnswer: scoopAnswersTable.normalizedAnswer,
      })
      .from(scoopAnswersTable)
      .where(
        and(
          eq(scoopAnswersTable.roomId, room.id),
          eq(scoopAnswersTable.questionId, question.id),
        ),
      );
    const counts = new Map<string, number>();
    for (const answer of answers) {
      counts.set(
        answer.normalizedAnswer,
        (counts.get(answer.normalizedAnswer) ?? 0) + 1,
      );
    }
    for (const answer of answers) {
      const count = counts.get(answer.normalizedAnswer) ?? 1;
      const points = Math.round((100 * (answers.length - count + 1)) / answers.length);
      const reward = getReward(points);
      await tx
        .update(scoopAnswersTable)
        .set({ points, tier: reward.tier, ingredient: reward.ingredient })
        .where(eq(scoopAnswersTable.id, answer.id));
    }
    await tx
      .update(scoopRoomsTable)
      .set({ phase: "revealed" })
      .where(eq(scoopRoomsTable.id, room.id));
  });
  res.json(
    RevealAnswersResponse.parse(
      await getRoomState(room.id, room.code, hashSessionToken(header.data["X-Session-Token"]!)),
    ),
  );
});

router.post("/rooms/:code/next", async (req, res): Promise<void> => {
  const params = NextQuestionParams.safeParse(req.params);
  const header = requestHeader(NextQuestionHeader, req.get("X-Session-Token"));
  if (!params.success || !header.success) {
    sendInputError(res, "Invalid room code.");
    return;
  }
  const room = await roomByCode(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return;
  }
  const host = await hostFor(room.id, header.data["X-Session-Token"], res);
  if (!host) return;
  if (room.phase !== "revealed") {
    res.status(409).json({ error: "Reveal this round before continuing." });
    return;
  }
  const nextRound = room.round + 1;
  await db
    .update(scoopRoomsTable)
    .set({
      round: Math.min(nextRound, 10),
      phase: nextRound > 10 ? "finished" : "answering",
    })
    .where(eq(scoopRoomsTable.id, room.id));
  res.json(
    NextQuestionResponse.parse(
      await getRoomState(room.id, room.code, hashSessionToken(header.data["X-Session-Token"]!)),
    ),
  );
});

export default router;

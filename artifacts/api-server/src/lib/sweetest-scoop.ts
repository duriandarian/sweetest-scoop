import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  scoopAnswersTable,
  scoopPlayersTable,
  scoopQuestionsTable,
  scoopRoomsTable,
} from "@workspace/db";
import type { RoomState } from "@workspace/api-zod";

export const sampleQuestions = [
  "What is Daniel's most-used phrase?",
  "What dessert would Amy pick for every celebration?",
  "Where should the happy couple travel next?",
  "What song will get everyone dancing?",
  "What is their ideal Sunday together?",
  "Which Meet Fresh topping would they share first?",
  "What would Daniel bring to a deserted island?",
  "What is Amy secretly the best at?",
  "What will they still be laughing about in 20 years?",
  "What is the sweetest thing about them as a couple?",
];

export const normalizeAnswer = (answer: string): string =>
  answer.trim().toLowerCase().replace(/\s+/g, " ");

export function createSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: createHash("sha256").update(token).digest("hex"),
  };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function roomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

type ScoredGroup = {
  answer: string;
  players: string[];
  count: number;
  points: number;
  tier: string;
  ingredient: string;
};

export function getReward(points: number): { tier: string; ingredient: string } {
  if (points < 20) {
    return { tier: "Surface", ingredient: points < 10 ? "Sprinkle" : "Boba" };
  }
  if (points < 40) {
    return { tier: "Upper Ice", ingredient: points < 30 ? "Red Bean" : "Taro Ball" };
  }
  if (points < 60) {
    return { tier: "Mid Ice", ingredient: points < 50 ? "Mochi" : "Lychee" };
  }
  if (points < 80) {
    return {
      tier: "Deep Ice",
      ingredient: points < 70 ? "Strawberry" : "Mango",
    };
  }
  return {
    tier: "Bottom",
    ingredient: points < 90 ? "Condensed Milk" : "Ice Cream Scoop",
  };
}

function scoreGroups(
  answers: Array<{
    answer: string;
    normalizedAnswer: string;
    playerName: string;
  }>,
): ScoredGroup[] {
  const grouped = new Map<string, { answer: string; players: string[] }>();
  for (const row of answers) {
    const entry = grouped.get(row.normalizedAnswer) ?? {
      answer: row.answer,
      players: [],
    };
    entry.players.push(row.playerName);
    grouped.set(row.normalizedAnswer, entry);
  }
  const total = answers.length;
  return [...grouped.values()]
    .map((group) => {
      const points =
        total === 0
          ? 0
          : Math.round((100 * (total - group.players.length + 1)) / total);
      const reward = getReward(points);
      return {
        answer: group.answer,
        players: group.players.sort((a, b) => a.localeCompare(b)),
        count: group.players.length,
        points,
        ...reward,
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.answer.localeCompare(b.answer, undefined, { sensitivity: "base" }),
    );
}

export async function getRoomState(
  roomId: string,
  code: string,
  sessionHash?: string,
): Promise<RoomState> {
  const [room] = await db
    .select()
    .from(scoopRoomsTable)
    .where(eq(scoopRoomsTable.id, roomId))
    .limit(1);
  if (!room) throw new Error("Room not found");

  const [players, questions] = await Promise.all([
    db
      .select()
      .from(scoopPlayersTable)
      .where(eq(scoopPlayersTable.roomId, roomId))
      .orderBy(asc(scoopPlayersTable.createdAt)),
    db
      .select()
      .from(scoopQuestionsTable)
      .where(eq(scoopQuestionsTable.roomId, roomId))
      .orderBy(asc(scoopQuestionsTable.position)),
  ]);

  const currentQuestion =
    room.round > 0 ? questions[room.round - 1] : undefined;
  const currentAnswers =
    currentQuestion && room.phase === "revealed"
      ? await db
          .select({
            answer: scoopAnswersTable.answer,
            normalizedAnswer: scoopAnswersTable.normalizedAnswer,
            playerName: scoopPlayersTable.displayName,
          })
          .from(scoopAnswersTable)
          .innerJoin(
            scoopPlayersTable,
            eq(scoopAnswersTable.playerId, scoopPlayersTable.id),
          )
          .where(
            and(
              eq(scoopAnswersTable.roomId, roomId),
              eq(scoopAnswersTable.questionId, currentQuestion.id),
            ),
          )
      : [];

  const [mine] = sessionHash
    ? await db
        .select({ isHost: scoopPlayersTable.isHost, id: scoopPlayersTable.id })
        .from(scoopPlayersTable)
        .where(
          and(
            eq(scoopPlayersTable.roomId, roomId),
            eq(scoopPlayersTable.sessionHash, sessionHash),
          ),
        )
        .limit(1)
    : [];

  const submittedCount =
    currentQuestion && room.phase === "answering"
      ? await db
          .select({ count: sql<number>`count(*)::int` })
          .from(scoopAnswersTable)
          .where(
            and(
              eq(scoopAnswersTable.roomId, roomId),
              eq(scoopAnswersTable.questionId, currentQuestion.id),
            ),
          )
      : [{ count: 0 }];

  const scoreRows = await db
    .select({
      playerId: scoopPlayersTable.id,
      displayName: scoopPlayersTable.displayName,
      points: sql<number>`coalesce(sum(${scoopAnswersTable.points}), 0)::int`,
      discoveries: sql<number>`count(${scoopAnswersTable.points})::int`,
    })
    .from(scoopPlayersTable)
    .leftJoin(
      scoopAnswersTable,
      eq(scoopPlayersTable.id, scoopAnswersTable.playerId),
    )
    .where(eq(scoopPlayersTable.roomId, roomId))
    .groupBy(scoopPlayersTable.id, scoopPlayersTable.displayName);

  const standings = scoreRows
    .map((row) => ({
      playerId: row.playerId,
      displayName: row.displayName,
      points: Number(row.points),
      discoveries: Number(row.discoveries),
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
    );

  const submitted = Boolean(
    mine &&
      currentQuestion &&
      room.phase === "answering" &&
      (await db
        .select({ id: scoopAnswersTable.id })
        .from(scoopAnswersTable)
        .where(
          and(
            eq(scoopAnswersTable.questionId, currentQuestion.id),
            eq(scoopAnswersTable.playerId, mine.id),
          ),
        )
        .limit(1))[0],
  );

  return {
    code,
    phase: room.phase as RoomState["phase"],
    round: room.round,
    questionCount: 10,
    questions: questions.map((question) => question.prompt),
    currentQuestion: currentQuestion?.prompt ?? null,
    players: players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      isHost: player.isHost,
    })),
    answers: room.phase === "revealed" ? scoreGroups(currentAnswers) : [],
    standings,
    isHost: Boolean(mine?.isHost),
    submitted,
    submittedCount: Number(submittedCount[0]?.count ?? 0),
  };
}

export async function roomByCode(code: string) {
  const [room] = await db
    .select()
    .from(scoopRoomsTable)
    .where(eq(scoopRoomsTable.code, code.toUpperCase()))
    .limit(1);
  return room;
}

export async function requireRoomPlayer(
  roomId: string,
  sessionToken: string | undefined,
) {
  if (!sessionToken) return null;
  const [player] = await db
    .select({
      id: scoopPlayersTable.id,
      isHost: scoopPlayersTable.isHost,
      displayName: scoopPlayersTable.displayName,
    })
    .from(scoopPlayersTable)
    .where(
      and(
        eq(scoopPlayersTable.roomId, roomId),
        eq(scoopPlayersTable.sessionHash, hashSessionToken(sessionToken)),
      ),
    )
    .limit(1);
  return player ?? null;
}

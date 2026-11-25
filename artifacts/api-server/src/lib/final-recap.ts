import { createHmac, timingSafeEqual } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { FinalRecap, RecapOutcome } from "@workspace/api-zod";
import { db, scoopAnswersTable, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import { TIERS } from "./party-scoring";
import { activeRoom } from "./room-expiry";

type RecapSeat = { playerId: string; roomId: string; sessionHash: string };
type Scope = { seat: RecapSeat } | { reference: string };
const outcomes: Record<(typeof TIERS)[number], RecapOutcome> = {
  "Sago Pearl": "sago-pearl",
  "Mango Cube": "mango-cube",
  "Pomelo Gem": "pomelo-gem",
  "Coconut Cloud": "coconut-cloud",
  "Golden Mango": "golden-mango",
};

function referenceFor(seat: RecapSeat): string {
  // The UUID only locates the seat. The separate, domain-bound signature is
  // keyed with its private session hash, which is never returned to a client.
  const signature = createHmac("sha256", Buffer.from(seat.sessionHash, "hex"))
    .update(`sweetest-scoop/final-recap/v1\0${seat.roomId}\0${seat.playerId}`)
    .digest("base64url");
  return `${seat.playerId}.${signature}`;
}

/** The public caller gets only the score and round outcomes, never seat data. */
export async function loadFinalRecap(scope: Scope): Promise<FinalRecap | undefined> {
  return db.transaction(async tx => {
    const playerId = "seat" in scope ? scope.seat.playerId : scope.reference.split(".", 1)[0];
    const [seat] = await tx.select({
      playerId: scoopPlayersTable.id, roomId: scoopPlayersTable.roomId,
      sessionHash: scoopPlayersTable.sessionHash,
    }).from(scoopPlayersTable)
      .innerJoin(scoopRoomsTable, eq(scoopRoomsTable.id, scoopPlayersTable.roomId))
      .where(and(eq(scoopPlayersTable.id, playerId), eq(scoopPlayersTable.isHost, false),
        eq(scoopRoomsTable.phase, "finished"), activeRoom(),
        "seat" in scope ? eq(scoopPlayersTable.roomId, scope.seat.roomId) : undefined,
        "seat" in scope ? eq(scoopPlayersTable.sessionHash, scope.seat.sessionHash) : undefined));
    if (!seat) return;
    const reference = referenceFor(seat);
    if ("reference" in scope) {
      const supplied = Buffer.from(scope.reference);
      const expected = Buffer.from(reference);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return;
    }

    const rows = await tx.select({
      points: scoopAnswersTable.points, basePoints: scoopAnswersTable.basePoints, tier: scoopAnswersTable.tier,
    }).from(scoopQuestionsTable)
      .leftJoin(scoopAnswersTable, and(eq(scoopAnswersTable.questionId, scoopQuestionsTable.id),
        eq(scoopAnswersTable.playerId, seat.playerId)))
      .where(eq(scoopQuestionsTable.roomId, seat.roomId))
      .orderBy(asc(scoopQuestionsTable.position));
    const rounds = rows.map(({ tier, basePoints }): RecapOutcome => {
      const savedTier = (basePoints ?? 0) > 0 && TIERS.find(value => value === tier);
      return savedTier ? outcomes[savedTier] : "skipped";
    });
    const totalPoints = rows.reduce((sum, row) => sum + (row.points ?? 0), 0);
    return { reference, recap: { totalPoints, rounds } };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

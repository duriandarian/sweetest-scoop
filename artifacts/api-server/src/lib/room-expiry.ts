import { eq, sql } from "drizzle-orm";
import { db, scoopAnswersTable, scoopPlayersTable, scoopRoomsTable } from "@workspace/db";
import { logger } from "./logger";

export type GameTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const activityTime = () => sql`clock_timestamp()`;
const cutoff = sql`statement_timestamp() - interval '1 hour'`;

// Before the activity column existed, writes were recorded by joins, accepted
// answers and round starts. Do not treat deployment time as player activity.
const lastActivity = sql`coalesce(${scoopRoomsTable.lastActivityAt}, greatest(
  ${scoopRoomsTable.createdAt}, ${scoopRoomsTable.roundStartedAt} - interval '3 seconds',
  (select max(${scoopPlayersTable.createdAt}) from ${scoopPlayersTable} where ${scoopPlayersTable.roomId} = ${scoopRoomsTable.id}),
  (select max(${scoopAnswersTable.createdAt}) from ${scoopAnswersTable} where ${scoopAnswersTable.roomId} = ${scoopRoomsTable.id})
))`;

export const activeRoom = () => sql`${lastActivity} > ${cutoff}`;
export const lockRoomCodes = (tx: GameTx) => tx.execute(sql`select pg_advisory_xact_lock(304013, 1)`);

/** Call only for a successful action, under the room's write lock. */
export async function touchRoom(tx: GameTx, roomId: string) {
  await tx.update(scoopRoomsTable).set({ lastActivityAt: activityTime() }).where(eq(scoopRoomsTable.id, roomId));
}

/** Caller holds the code allocation lock; room foreign keys cascade the deletion. */
export async function deleteExpiredRooms(tx: GameTx) {
  await tx.delete(scoopRoomsTable).where(sql`${lastActivity} <= ${cutoff}`);
}

export function startRoomCleanup() {
  let running = false;
  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      await db.transaction(async tx => {
        await lockRoomCodes(tx);
        await deleteExpiredRooms(tx);
      });
    } catch (err) {
      logger.error({ err }, "Could not remove expired game rooms");
    } finally {
      running = false;
    }
  };
  void sweep();
  setInterval(() => void sweep(), 60_000).unref();
}

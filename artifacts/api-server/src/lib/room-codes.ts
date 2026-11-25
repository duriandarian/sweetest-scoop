import { randomBytes, randomInt } from "node:crypto";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, scoopPlayersTable, scoopRoomsTable } from "@workspace/db";
import { hashSessionToken } from "./room-session";
import { activeRoom, deleteExpiredRooms, lockRoomCodes, type GameTx } from "./room-expiry";

const rotation = ["DAN", "AMY", "RBF"] as const;
const archivedPrefix = (code: string) => `${code}~`;

/** The unique storage key of a retired room still carries its original join code. */
export const publicRoomCode = (key: string) => key.split("~", 1)[0];

/** Called under the same lock as the preferred codes and the room insert. */
async function randomUnusedCode(tx: GameTx) {
  const existing = await tx.select({ code: scoopRoomsTable.code }).from(scoopRoomsTable)
    .where(sql`${scoopRoomsTable.code} ~ '^[A-Z]{3}$'`);
  const occupied = new Set<string>([...rotation, ...existing.map(row => row.code)]);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", base = alphabet.length, space = base ** 3;
  if (occupied.size >= space) return null;
  // Select a random slot among the free codes so a collision never rejects a host.
  let slot = randomInt(space - occupied.size);
  for (let i = 0; i < space; i++) {
    const code = alphabet[Math.floor(i / (base * base))] + alphabet[Math.floor(i / base) % base] + alphabet[i % base];
    if (!occupied.has(code) && slot-- === 0) return code;
  }
  return null;
}

export async function allocateRoomCode(tx: GameTx) {
  // One rotation shared across API instances; held until the new room commits.
  await lockRoomCodes(tx);
  await deleteExpiredRooms(tx);
  const current = await tx.select().from(scoopRoomsTable)
    .where(inArray(scoopRoomsTable.code, [...rotation]))
    .orderBy(desc(scoopRoomsTable.createdAt)).for("update");
  const last = rotation.findIndex(code => code === current[0]?.code);
  for (let step = 1; step <= rotation.length; step++) {
    const code = rotation[(last + step) % rotation.length];
    const room = current.find(entry => entry.code === code);
    if (!room) return code;
    if (room.phase === "lobby") {
      const [guest] = await tx.select({ id: scoopPlayersTable.id }).from(scoopPlayersTable).where(and(
        eq(scoopPlayersTable.roomId, room.id), eq(scoopPlayersTable.isHost, false),
      )).limit(1);
      if (guest) continue;
    }
    if (room.phase === "answering" || room.phase === "revealed") continue;

    // Free the public code without deleting scores or changing a player's seat.
    let key: string;
    for (;;) {
      key = archivedPrefix(code) + randomBytes(3).toString("base64url");
      const [collision] = await tx.select({ id: scoopRoomsTable.id }).from(scoopRoomsTable)
        .where(eq(scoopRoomsTable.code, key)).limit(1);
      if (!collision) break;
    }
    await tx.update(scoopRoomsTable).set({ code: key }).where(eq(scoopRoomsTable.id, room.id));
    return code;
  }
  return randomUnusedCode(tx);
}

export async function roomByCode(input: string, sessionToken?: string) {
  const code = input.toUpperCase();
  if (sessionToken && rotation.some(value => value === code)) {
    const [seat] = await db.select({ room: scoopRoomsTable }).from(scoopPlayersTable)
      .innerJoin(scoopRoomsTable, eq(scoopPlayersTable.roomId, scoopRoomsTable.id))
      .where(and(eq(scoopPlayersTable.sessionHash, hashSessionToken(sessionToken)), activeRoom(),
        or(eq(scoopRoomsTable.code, code), like(scoopRoomsTable.code, `${archivedPrefix(code)}%`))))
      .limit(1);
    if (seat) return seat.room;
  }
  // Without a matching session, only the current public room is joinable.
  const [room] = await db.select().from(scoopRoomsTable).where(and(eq(scoopRoomsTable.code, code), activeRoom())).limit(1);
  return room;
}

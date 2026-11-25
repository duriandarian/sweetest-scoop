/// <reference lib="dom" />
/** Run only against the local development API, web preview, and database. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import jsQR from "jsqr";
import { chromium, type Browser } from "playwright-core";
import { db, pool, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import type { RoomState, SessionRoom } from "@workspace/api-zod";
import { GAME_VERSION } from "../lib/party-scoring";
import { createSessionToken } from "../lib/room-session";

const origin = "http://localhost:80";
const roomCode = randomBytes(3).toString("hex").toUpperCase();
const createdIds: string[] = [];
const host = createSessionToken();
let browser: Browser | undefined;

async function newRoom() {
  const [room] = await db.insert(scoopRoomsTable).values({ code: roomCode, bankVersion: GAME_VERSION, lastActivityAt: new Date() }).returning();
  createdIds.push(room.id);
  await db.insert(scoopQuestionsTable).values({ roomId: room.id, position: 0, prompt: "A test question" });
  return room.id;
}

async function getRoom(token?: string) {
  const response = await fetch(`${origin}/api/rooms/${roomCode}`, {
    headers: token ? { "X-Session-Token": token } : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200);
  return await response.json() as RoomState;
}

try {
  const roomId = await newRoom();
  await db.insert(scoopPlayersTable).values({ roomId, displayName: "QR smoke host", isHost: true, sessionHash: host.hash });
  assert.equal((await getRoom()).roomInstanceId, undefined, "Public room state does not need an instance identifier.");
  assert.equal((await getRoom(host.token)).roomInstanceId, roomId);

  const executablePath = process.env.CHROMIUM_PATH ?? execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  const projector = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await projector.addInitScript(({ code, token }) => localStorage.setItem(`sweetest-scoop:${code}`, token), { code: roomCode, token: host.token });
  await projector.goto(`${origin}/room/${roomCode}`);
  const qr = projector.getByTestId("lobby-invite-qr");
  await qr.waitFor({ state: "visible" });
  assert.equal(await projector.getByTestId("text-room-code").textContent(), roomCode);
  await projector.getByRole("button", { name: "Copy room code" }).waitFor({ state: "visible" });

  // Decode the actual rendered QR, including its white quiet zone. Do not infer
  // the destination from a fixture URL or from an equivalent href.
  const pixels = await qr.evaluate(async node => {
    const svg = node as unknown as SVGSVGElement;
    const image = new Image();
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    try {
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.round(svg.getBoundingClientRect().width);
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return { data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data), size: canvas.width };
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  const decoded = jsQR(new Uint8ClampedArray(pixels.data), pixels.size, pixels.size)?.data;
  assert.ok(decoded, "The rendered host QR must be readable.");
  const invite = new URL(decoded);
  assert.equal(invite.origin, new URL(origin).origin);
  assert.equal(invite.pathname, `/room/${roomCode}`);
  assert.deepEqual([...invite.searchParams], [["invite", roomId]]);
  assert.equal(invite.hash, "");

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.goto(decoded);
  await phone.getByText(`Room ${roomCode}`, { exact: true }).waitFor({ state: "visible" });
  assert.equal(await phone.getByTestId("input-room-code").count(), 0);
  const nameField = phone.getByTestId("input-room-join-name");
  await nameField.fill("Scanned Bobi");
  await phone.getByTestId("button-wardrobe-hat-frog").click();
  assert.equal(await phone.getByTestId("button-wardrobe-hat-frog").getAttribute("aria-checked"), "true");
  const joinedResponse = phone.waitForResponse(response => response.url().endsWith("/players") && response.status() === 201);
  await phone.getByTestId("button-room-join").click();
  const player = await (await joinedResponse).json() as SessionRoom;
  assert.equal(player.room.roomInstanceId, roomId);
  const saved = player.room.players.find(seat => seat.id === player.room.playerId);
  assert.equal(saved?.displayName, "Scanned Bobi");
  assert.notEqual(saved?.avatar, "mango");
  const inCup = projector.getByTestId(`tea-bobi-${saved?.id}`);
  await inCup.getByText("Scanned Bobi", { exact: true }).waitFor({ state: "visible" });
  const projectorState = await getRoom(host.token);
  assert.equal(projectorState.players.find(seat => seat.id === saved?.id)?.avatar, saved?.avatar);
  await phone.reload();
  await phone.getByTestId(`player-${saved?.id}`).waitFor({ state: "visible" });
  assert.equal(await phone.getByTestId("button-room-join").count(), 0, "The same invite resumes the existing seat.");

  const manual = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await manual.goto(origin);
  await manual.getByTestId("button-choose-join").click();
  await manual.getByTestId("input-room-code").fill(roomCode);
  await manual.getByTestId("input-guest-name").fill("Scanned Bobi");
  await manual.getByTestId("button-join-room").click();
  await manual.getByText(/That name is already taken/).waitFor({ state: "visible" });
  await manual.getByTestId("input-guest-name").fill("Manual Bobi");
  await manual.getByTestId("button-join-room").click();
  await projector.locator('[data-testid^="tea-bobi-"]').getByText("Manual Bobi", { exact: true }).waitFor({ state: "visible" });

  await projector.setViewportSize({ width: 390, height: 844 });
  assert.ok(await qr.isVisible());
  assert.equal(await projector.getByTestId("button-copy-room").isVisible(), true);
  assert.ok(await projector.getByTestId("host-lobby-join-code").evaluate(node => node.getBoundingClientRect().right <= window.innerWidth));

  await projector.getByTestId("button-start-game").click();
  await projector.getByTestId("lobby-invite-qr").waitFor({ state: "hidden" });
  const late = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await late.goto(decoded);
  await late.getByTestId("input-room-join-name").fill("Late Bobi");
  await late.getByTestId("button-room-join").click();
  await late.getByText(/This game has started/).waitFor({ state: "visible" });

  await db.update(scoopRoomsTable).set({ lastActivityAt: sql`statement_timestamp() - interval '2 hours'` }).where(eq(scoopRoomsTable.id, roomId));
  await late.getByTestId("button-room-join").click();
  await late.getByText(/This invite has expired/).waitFor({ state: "visible" });
  await db.delete(scoopRoomsTable).where(eq(scoopRoomsTable.id, roomId));
  const replacement = await newRoom();
  const newcomer = await fetch(`${origin}/api/rooms/${roomCode}/players`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "New room Bobi" }), signal: AbortSignal.timeout(10_000),
  });
  assert.equal(newcomer.status, 201);
  const replacementSeat = await newcomer.json() as SessionRoom;
  assert.equal(replacementSeat.room.roomInstanceId, replacement);
  await late.evaluate(({ code, token }) => localStorage.setItem(`sweetest-scoop:${code}`, token), { code: roomCode, token: replacementSeat.sessionToken });
  await late.reload();
  await late.getByTestId("input-room-join-name").fill("Wrong room Bobi");
  await late.getByTestId("button-room-join").click();
  await late.getByText(/This invite has expired/).waitFor({ state: "visible" });
  assert.deepEqual((await getRoom()).players.map(seat => seat.displayName), ["New room Bobi"]);
  await late.goto(`${origin}/room/${roomCode}?invite=incomplete`);
  await late.getByText(/This invite link is incomplete/).waitFor({ state: "visible" });
  process.stdout.write("Lobby QR decoded and verified in a fresh phone browser; outfit, name checks, manual entry, recovery, and stale-link safety passed.\n");
} finally {
  await browser?.close();
  if (createdIds.length) await db.delete(scoopRoomsTable).where(inArray(scoopRoomsTable.id, createdIds));
  await pool.end();
}

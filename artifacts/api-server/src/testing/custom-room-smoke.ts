/** Local preview only. Plays a two-round custom room and removes only its own fixtures. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { chromium, type Browser } from "playwright-core";
import { db, pool, scoopPlayersTable, scoopQuestionsTable, scoopRoomsTable } from "@workspace/db";
import type { RoomEntryProblem, RoomState, SessionRoom } from "@workspace/api-zod";
import { ROUND_COUNT } from "../lib/party-scoring";

const origin = "http://localhost";
const suffix = randomBytes(4).toString("hex");
const createdIds: string[] = [];
const draft = [
  "Question\tAnswer\tDessert tier",
  "Name a fruit\tApple\tSago Pearl",
  "\tDragon fruit\tGolden Mango",
  "Name a winter sport\tIce skating\tPomelo Gem",
  "\tBobsleigh\tCoconut Cloud",
].join("\n");
const broken = draft + "\n\tice-skating\tSago Pearl\n\t\tSpace Rocks";
let browser: Browser | undefined;

async function call<T>(path: string, { method = "GET", token, body, status = 200 }: {
  method?: string; token?: string; body?: unknown; status?: number;
} = {}): Promise<T> {
  const response = await fetch(`${origin}/api${path}`, {
    method, headers: { "Content-Type": "application/json", ...(token && { "X-Session-Token": token }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${payload.error ?? response.statusText}`);
  return payload as T;
}

function remember(session: SessionRoom) {
  const { roomInstanceId } = session.room;
  assert.ok(roomInstanceId);
  createdIds.push(roomInstanceId);
  return roomInstanceId;
}

try {
  const invalidHost = `Invalid ${suffix}`;
  const rejected = await call<RoomEntryProblem>("/rooms", {
    method: "POST", body: { hostName: invalidHost, customQuestionsTsv: broken }, status: 400,
  });
  assert.deepEqual(rejected.issues?.map(i => i.row), [6, 7, 7]);
  assert.equal((await db.select({ id: scoopPlayersTable.id }).from(scoopPlayersTable)
    .where(eq(scoopPlayersTable.displayName, invalidHost))).length, 0);

  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    args: ["--no-sandbox"],
  });
  const host = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  await host.goto(origin);
  await host.getByTestId("button-choose-create").click();
  assert.equal(await host.getByTestId("radio-game-party").isChecked(), true);
  await host.getByTestId("radio-game-custom").check();
  const paste = host.getByTestId("input-custom-bank");
  const create = host.getByTestId("button-create-room");
  const preview = host.getByTestId("button-preview-custom");
  const hostName = `Custom ${suffix}`;
  await host.getByTestId("input-host-name").fill(hostName);
  await paste.fill(broken);
  await preview.click();
  await host.getByTestId("custom-bank-errors").getByText("Row 6", { exact: true }).waitFor();
  assert.equal(await paste.inputValue(), broken);
  assert.equal(await create.isDisabled(), true);
  await host.reload();
  assert.equal(await paste.inputValue(), broken);
  assert.equal(await host.getByTestId("input-host-name").inputValue(), hostName);
  await paste.fill(draft);
  assert.equal(await create.isDisabled(), true);
  await preview.click();
  const menu = host.getByTestId("custom-bank-preview");
  await menu.getByText("Name a fruit", { exact: true }).waitFor();
  assert.equal(await menu.getByText("2 answers", { exact: true }).count(), 2);
  if (process.env.CUSTOM_SETUP_SCREENSHOT) {
    await host.evaluate(() => window.scrollTo(0, 0));
    await host.screenshot({ path: process.env.CUSTOM_SETUP_SCREENSHOT, fullPage: true });
  }
  const created = host.waitForResponse(res => res.url().endsWith("/api/rooms") && res.request().method() === "POST");
  await create.click();
  const response = await created;
  assert.equal(response.status(), 201, await response.text());
  const session = await response.json() as SessionRoom;
  const roomId = remember(session);
  const url = `/rooms/${session.room.code}`;
  assert.equal(session.room.questionCount, 2);
  assert.deepEqual(session.room.questions, []);
  assert.deepEqual(session.room.possibleAnswers, []);

  const other = await call<SessionRoom>("/rooms", {
    method: "POST", body: { hostName: `Other ${suffix}`, customQuestionsTsv: "Name a color\tChartreuse\tCoconut Cloud" }, status: 201,
  });
  remember(other);
  assert.equal(other.room.questionCount, 1);
  const party = await call<SessionRoom>("/rooms", { method: "POST", body: { hostName: `Party ${suffix}` }, status: 201 });
  remember(party);
  assert.equal(party.room.questionCount, ROUND_COUNT);
  assert.equal(party.room.questions.length, ROUND_COUNT);

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.goto(`${origin}/room/${session.room.code}`);
  await phone.getByTestId("input-room-join-name").fill("Phone Bobi");
  const joined = phone.waitForResponse(res => res.url().endsWith("/players") && res.status() === 201);
  await phone.getByTestId("button-room-join").click();
  const guest = await (await joined).json() as SessionRoom;
  assert.deepEqual(guest.room.questions, []);
  assert.equal(guest.room.questionCount, 2);
  const remainingGuests = [];
  for (let i = 0; i < 4; i++) remainingGuests.push(await call<SessionRoom>(`${url}/players`, {
    method: "POST", body: { displayName: `Test Bobi ${i + 1}` }, status: 201,
  }));
  await call(`${url}/questions`, { method: "PUT", token: session.sessionToken, body: { questions: ["Changed!"] }, status: 409 });
  await host.reload();
  await host.getByTestId("button-start-game").click();
  await host.getByTestId("round-ready").getByText("Round 1 of 2", { exact: true }).waitFor();
  const before = await call<RoomState>(url, { token: guest.sessionToken });
  assert.equal(Date.parse(before.roundEndsAt!) - Date.parse(before.roundStartedAt!), 25_000);
  assert.deepEqual(before.questions, ["Name a fruit"]);
  assert.deepEqual(before.possibleAnswers, []);
  assert.doesNotMatch(JSON.stringify(before), /winter sport|Ice skating|Apple|Dragon fruit|Bobsleigh/);
  const unauthenticated = await call<RoomState>(url);
  assert.deepEqual(unauthenticated.questions, []);
  assert.equal(unauthenticated.currentQuestion, null);
  await host.getByText("Round 1 of 2", { exact: true }).waitFor();
  await phone.getByTestId("text-prompt-progress").getByText("Prompt 1 of 2").waitFor();
  const input = phone.getByTestId("input-answer");
  const submit = phone.getByTestId("button-submit-answer");
  await input.fill("Dragno fruit");
  await submit.click();
  await phone.getByTestId("status-answer-correction").getByText("“Dragon fruit”", { exact: true }).waitFor();
  assert.equal(await input.inputValue(), "Dragon fruit");
  const awaitingConfirmation = await call<RoomState>(url, { token: guest.sessionToken });
  assert.equal(awaitingConfirmation.submitted, false);
  assert.deepEqual(awaitingConfirmation.possibleAnswers, []);
  await submit.click();
  await phone.getByTestId("status-answer-locked").waitFor();
  const locked = await call<RoomState>(url, { token: guest.sessionToken });
  assert.equal(locked.myReward?.basePoints, 100);
  assert.ok(locked.myReward.speedBonus > 0 && locked.myReward.speedBonus <= 20);
  for (const seat of remainingGuests) await call(`${url}/answer`, { method: "PUT", token: seat.sessionToken, body: { answer: "APPLE", round: 1 } });
  const roundPodium = host.getByTestId("podium-round");
  await roundPodium.waitFor();
  assert.equal(await roundPodium.locator("li").count(), 5);
  await host.getByTestId("filter-golden-mango").click();
  const catalog = host.getByTestId("section-catalog");
  await catalog.getByText("Dragon fruit", { exact: true }).waitFor();
  assert.equal(await catalog.getByText("Apple", { exact: true }).count(), 0);
  await phone.getByTestId("section-catalog").getByText("Apple", { exact: true }).waitFor();
  await host.getByTestId("button-next-round").click();
  await phone.getByTestId("text-prompt-progress").getByText("Prompt 2 of 2").waitFor();
  await phone.reload();
  await phone.getByText("Name a winter sport", { exact: true }).waitFor();
  await input.fill("ice SKATING");
  await submit.click();
  await phone.getByTestId("status-answer-locked").waitFor();
  for (const seat of remainingGuests) await call(`${url}/answer`, { method: "PUT", token: seat.sessionToken, body: { answer: "Bobsleigh", round: 2 } });
  const final = host.getByTestId("button-next-round");
  await final.getByText("Final standings").waitFor();
  await final.click();
  await host.getByTestId("podium-final").waitFor();
  await phone.getByTestId("podium-final").waitFor();
  const state = await call<RoomState>(url, { token: guest.sessionToken });
  assert.equal(state.round, 2);
  assert.equal(state.phase, "finished");
  assert.equal(state.myReward?.basePoints, 60);
  const recap = await call<{ recap: { rounds: string[] } }>(`${url}/recap`, { token: guest.sessionToken });
  assert.deepEqual(recap.recap.rounds, ["golden-mango", "pomelo-gem"]);
  await db.update(scoopRoomsTable).set({ lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
    .where(eq(scoopRoomsTable.id, roomId));
  await call(url, { token: session.sessionToken, status: 401 });
  // The periodic/allocation cleanup retains ownership of expired rows. Confirm
  // the room's own foreign key removes the imported bank when its room goes.
  await db.delete(scoopRoomsTable).where(eq(scoopRoomsTable.id, roomId));
  assert.deepEqual(await db.select({ id: scoopQuestionsTable.id }).from(scoopQuestionsTable)
    .where(eq(scoopQuestionsTable.roomId, roomId)), []);
  process.stdout.write("Custom-room smoke passed: preview, errors, draft and live reload, room isolation, scoring, filters, final podium, and bank cleanup.\n");
} finally {
  await browser?.close();
  if (createdIds.length) await db.delete(scoopRoomsTable).where(inArray(scoopRoomsTable.id, createdIds));
  await pool.end();
}

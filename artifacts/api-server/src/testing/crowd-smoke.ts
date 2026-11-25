/**
 * Development-only crowd simulation; never targets the published app.
 * pnpm --filter @workspace/api-server exec tsx src/testing/crowd-smoke.ts [40]
 * Creates one disposable room and deletes only that room in finally.
 * Measures HTTP requests and estimated timer opening, not browser rendering or venue Wi-Fi.
 */
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { eq } from "drizzle-orm";
import type { RoomState } from "@workspace/api-zod";
import { db, pool, scoopPlayersTable, scoopRoomsTable } from "@workspace/db";
import { hashSessionToken } from "../lib/room-session";
import { questionBank, ROUND_COUNT } from "../lib/party-scoring";

const base = "http://localhost:80/api";
const count = Number(process.argv[2] ?? 40);
assert.ok(Number.isInteger(count) && count >= 2 && count <= 100, "Use 2–100 development test guests.");
type Kind = "join" | "poll" | "answer" | "control";
const samples: Record<Kind, number[]> = { join: [], poll: [], answer: [], control: [] };
const failures: string[] = [];
type Session = { sessionToken: string; room: RoomState };
type RoundArrival = { receivedAt: number; sentAt: number; start: string; end: string; question: string };
type Guest = { playerId: string; jitter: number; state: RoomState; rounds: Map<number, RoundArrival> };
const questionLeadMs: number[] = [];
const estimatedOpeningDelayMs: number[] = [];
let testRoomId: string | undefined;
let stop = false;
const polling: Promise<void>[] = [];

async function call<T = RoomState>(path: string, kind: Kind, token?: string, body?: unknown, method = body ? "POST" : "GET"): Promise<T> {
  const started = performance.now();
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { "X-Session-Token": token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    assert.ok(response.ok, `${kind}: unexpected HTTP ${response.status}`);
    return await response.json() as T;
  } finally {
    samples[kind].push(performance.now() - started);
  }
}

function validatePrivateSnapshot(state: RoomState) {
  if (state.phase !== "answering") return;
  assert.equal(state.answers.length, 0, "Other players' answers stay hidden while answering.");
  assert.equal(state.possibleAnswers?.length, 0, "The answer bank stays hidden until round completion.");
  assert.equal(state.roundStandings?.length, 0);
}

function poll(root: string, token: string, stagger: number, guest?: Guest) {
  return (async () => {
    await sleep(stagger);
    while (!stop) {
      try {
        const state = await call(root, "poll", token);
        const receivedAt = Date.now();
        validatePrivateSnapshot(state);
        if (guest) {
          assert.equal(state.playerId, guest.playerId, "A guest refresh must reconnect to the correct seat.");
          guest.state = state;
          if (state.phase === "answering" && !guest.rounds.has(state.round)) {
            assert.ok(state.roundStartedAt && state.roundEndsAt && state.currentQuestion && state.serverNow);
            guest.rounds.set(state.round, {
              receivedAt, sentAt: Date.parse(state.serverNow), start: state.roundStartedAt,
              end: state.roundEndsAt, question: state.currentQuestion,
            });
          }
        }
        if (state.phase === "finished") return;
        // Mirror the foreground phone/host intervals in game/room-polling.ts.
        const interval = state.phase === "answering" ? (guest ? 1500 : 1000) : 2500;
        await sleep(interval + (guest?.jitter ?? 100));
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "Poll failed");
        return;
      }
    }
  })();
}

async function waitForGuests(guests: Guest[], reached: (guest: Guest) => boolean, deadline: number, label: string) {
  while (true) {
    assert.equal(failures.length, 0, failures[0]);
    const pending = guests.filter(guest => !reached(guest)).length;
    if (!pending) return;
    assert.ok(Date.now() < deadline, `${pending}/${guests.length} guests never received ${label} within the test window.`);
    await sleep(20);
  }
}

function timing(values: number[]) {
  const sorted = values.slice().sort((a, b) => a - b);
  const percentile = (p: number) => Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? 0);
  return { medianMs: percentile(.5), p95Ms: percentile(.95), maxMs: percentile(1) };
}

function metrics(kind: Kind) {
  return { requests: samples[kind].length, ...timing(samples[kind]) };
}

try {
  const created = await call<Session>("/rooms", "control", undefined, { hostName: "Crowd test moderator" });
  const root = `/rooms/${created.room.code}`, host = created.sessionToken;
  const [seat] = await db.select({ roomId: scoopPlayersTable.roomId }).from(scoopPlayersTable)
    .where(eq(scoopPlayersTable.sessionHash, hashSessionToken(host)));
  testRoomId = seat.roomId;
  const joined = await Promise.all(Array.from({ length: count }, (_, i) =>
    call<Session>(`${root}/players`, "join", undefined, {
      displayName: `Crowd guest ${i + 1}`, avatar: `b1:${i % 6}:${i % 14}:${i % 12}:${i % 12}`,
    })));
  const tokens = joined.map(session => session.sessionToken);
  assert.ok(joined.every(({ room }) => room.playerId && room.code === created.room.code && !room.isHost));
  assert.equal(new Set(tokens).size, count);
  const totals = new Map(joined.map(session => [session.room.playerId!, 0]));
  assert.equal(totals.size, count);
  const lobby = await call(root, "control", host);
  const roster = new Set(lobby.players.filter(p => !p.isHost).map(p => p.id));
  assert.deepEqual(roster, new Set(totals.keys()));
  // Initial page-load burst, then realistic independent refreshes throughout play.
  const guests = await Promise.all(tokens.map(async (token, i): Promise<Guest> => {
    const playerId = joined[i].room.playerId!;
    const state = await call(root, "poll", token);
    assert.equal(state.playerId, playerId, "Each guest can load their own seat after joining.");
    assert.equal(state.phase, "lobby");
    assert.deepEqual(new Set(state.players.filter(p => !p.isHost).map(p => p.id)), roster);
    return { playerId, jitter: Math.round(399 * i / (count - 1)), state, rounds: new Map() };
  }));
  tokens.forEach((token, i) => polling.push(poll(root, token, Math.floor((2500 + guests[i].jitter) * i / count), guests[i])));
  polling.push(poll(root, host, 0));
  let before = await call(`${root}/start`, "control", host, {});

  for (let round = 1; round <= ROUND_COUNT; round++) {
    assert.equal(before.phase, "answering");
    assert.equal(before.round, round);
    assert.equal(before.roundDuration, 25);
    const startAt = Date.parse(before.roundStartedAt!);
    assert.equal(Date.parse(before.roundEndsAt!) - startAt, 25_000);
    await waitForGuests(guests, guest => guest.rounds.has(round), startAt + 5_000, `the round ${round} question`);
    for (const guest of guests) {
      const arrival = guest.rounds.get(round)!;
      assert.equal(arrival.start, before.roundStartedAt);
      assert.equal(arrival.end, before.roundEndsAt);
      assert.equal(arrival.question, before.currentQuestion);
      questionLeadMs.push(startAt - arrival.receivedAt);
      // The UI uses receivedAt - serverNow to schedule a local wakeup. Its
      // clock keeps the least-delayed sample, so the first alone is conservative.
      estimatedOpeningDelayMs.push(Math.max(0, arrival.receivedAt - startAt, arrival.receivedAt - arrival.sentAt));
    }
    await sleep(Math.max(0, startAt - Date.now()) + 100);
    assert.equal(failures.length, 0, failures[0]);
    const answer = questionBank[round - 1].catalog[0].answer;
    // Deliberately harsher than normal play: every guest submits in one burst
    // while all background polls keep running.
    const submitted = await Promise.all(tokens.map(token =>
      call(`${root}/answer`, "answer", token, { round, answer }, "PUT")));
    for (const state of submitted) {
      assert.equal(state.submitted, true);
      assert.equal(state.myAnswer, answer);
      assert.ok(state.myReward);
      const reward = state.myReward!;
      assert.equal(reward.points, reward.basePoints + reward.speedBonus);
      assert.equal(reward.speedBonus, Math.round(20 * (1 - reward.elapsedMs / 25000)));
      assert.equal(state.roundEndsAt, before.roundEndsAt);
      totals.set(state.playerId!, totals.get(state.playerId!)! + reward.points);
    }
    const revealed = await call(root, "control", host);
    assert.equal(revealed.phase, "revealed");
    assert.equal(revealed.round, round, "The next question must still wait for the host.");
    assert.equal(revealed.submittedCount, count);
    assert.equal(revealed.roundStandings?.length, count);
    assert.ok(Date.parse(revealed.serverNow!) < Date.parse(before.roundEndsAt!));
    for (const standing of revealed.standings) {
      assert.equal(standing.points, totals.get(standing.playerId), "Every cumulative score is preserved.");
      assert.equal(standing.discoveries, round);
    }
    const refreshed = await Promise.all(tokens.slice(0, 3).map(token => call(root, "control", token)));
    assert.ok(refreshed.every(state => state.phase === "revealed"));
    await waitForGuests(guests, guest => guest.state.phase === "revealed" && guest.state.round === round, Date.now() + 6_000, `round ${round} results`);
    before = await call(`${root}/next`, "control", host, { round });
    assert.equal(before.phase, round === ROUND_COUNT ? "finished" : "answering");
  }
  assert.equal(failures.length, 0, failures[0]);
  const final = await call(root, "control", host);
  assert.equal(final.standings.length, count);
  assert.equal(final.phase, "finished");
  assert.equal(new Set(final.standings.map(s => s.playerId)).size, count);
  await waitForGuests(guests, guest => guest.state.phase === "finished", Date.now() + 6_000, "the final standings");
  for (const guest of guests) assert.deepEqual(guest.state.standings, final.standings);
  stop = true;
  await Promise.all(polling);
  assert.equal(failures.length, 0, failures[0]);
  const questionOpening = {
    received: questionLeadMs.length,
    receivedByStart: questionLeadMs.filter(ms => ms >= 0).length,
    minimumHeadStartMs: Math.min(...questionLeadMs),
    estimatedOpeningDelay: timing(estimatedOpeningDelayMs),
  };
  process.stdout.write(JSON.stringify({
    environment: "development HTTP simulation", guests: count, rounds: ROUND_COUNT, failures: failures.length,
    join: metrics("join"), questionOpening, poll: metrics("poll"), answer: metrics("answer"), control: metrics("control"),
    checks: ["concurrent joins", "authenticated seats and matching lobby roster", "every guest receives every question and result",
      "continuous private polling", "simultaneous answer bursts",
      "all-answered early reveal", "exact cumulative scores", "refresh recovery", "host-only progression"],
  }, null, 2) + "\n");
  // Preview rehearsal targets, not production guarantees.
  assert.equal(questionOpening.receivedByStart, count * ROUND_COUNT, "Every guest must receive every question by the countdown opening.");
  assert.ok(questionOpening.estimatedOpeningDelay.maxMs < 500, "Estimated question opening must stay within half a second of the server schedule.");
  assert.ok(metrics("poll").p95Ms < 500, "Development room-read p95 must stay under half a second.");
  assert.ok(metrics("answer").p95Ms < 1000, "Development answer p95 must stay under one second.");
} finally {
  stop = true;
  await Promise.allSettled(polling);
  if (testRoomId) await db.delete(scoopRoomsTable).where(eq(scoopRoomsTable.id, testRoomId));
  await pool.end();
}

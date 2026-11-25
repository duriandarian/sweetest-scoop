# Phone recovery journey under network interruption — run report

Target: development preview only (REPLIT_DEV_DOMAIN). Viewport 390x844. Room code `S27BJH` (created by this test; no delete endpoint exists in `artifacts/api-server/src/routes/sweetest-scoop.ts`, so the room was left in place). Credentials and session tokens are intentionally omitted.

## Final outcome
All required scenarios passed across the initial journey and the focused completion run below. Initial timing gaps B–E were closed by F1–F7; they are retained below as an accurate record of the first run, not outstanding work. Interruption injection was at the browser fetch boundary, not a physical Wi-Fi or OS-level disconnect. API smoke separately passed all seven rounds.

The score HUD temporarily showing the pre-answer total is intentional: `PlayerDive` subtracts this round's reward until the dive reveal, then displays the saved cumulative total. The refresh retained the exact reward and total on the server; no score was lost.

The reconnect-card flicker was fixed after the run by retaining the reconnect message during retries once a load has failed (`errorUpdatedAt`), rather than switching back to the initial loading skeleton. This small rendering-only fix was typechecked; it was not given another browser pass.

Cleanup: all three rooms created by this browser verification (`S27BJH`, `E9VVX4`, `3ZEKGK`) were deleted after testing. No other rooms were touched.

## Method
- Stagehand has no `page.route`. Interruptions were injected in-page by wrapping `window.fetch` via `phone-recovery.fault-init.js` (the API client uses global fetch). Documents and static assets were never blocked.
- Host progression, guest joins, and the duplicate/old-round/guest-denial checks used direct API calls with `X-Session-Token`.
- Setup: host `POST /api/rooms`; guests `POST /api/rooms/:code/players` (avatar `mango`); guest1 localStorage `sweetest-scoop:S27BJH` seeded; `/room/S27BJH` loaded; host `POST /start`.

## Results (assertions and observations)
| # | Step | Expected | Observed | Status |
|---|------|----------|----------|--------|
| 1 | Start | 200, answering, round 1, 25 s | 200, answering, round 1, duration 25 | PASS |
| 2 | Type `Bruno Mras`, DIVE | Correction `Bruno Mars` shown, not stored | Correction “Bruno Mras” → “Bruno Mars”, button CONFIRM; server myAnswer null before confirm | PASS |
| 3 | Arm PUT response drop, CONFIRM | Request forwarded, response aborted | Fault log: PUT /answer `response-aborted-after-forward`, serverStatus 200 | PASS |
| 4 | Phone recovery after aborted response | Canonical `Bruno Mars`, private score, locked | Locked, reward “Bruno Mars”, 23 pts, locked at 21.8 s; no alert left behind | PASS |
| 5 | Duplicate PUT (API, same answer) | No second score | 409 “Time is up. Answers are closed.” (deadline had passed); total stays 23 | PASS (note: the 409 came from the deadline, not the “already locked” branch) |
| 6 | Offline near deadline, timer does not reset | Countdown continues | Offline was entered AFTER round-1 deadline (timing miss). Round 4 check: timer 18→17→16→15→14→13 s over 5 s offline, banner shown | PASS for round 4; round-1 near-deadline timing NOT tested |
| 7 | Host reads after deadline, reveal, next while offline | reveal 200, next 200 round 2 | reveal 200; next 200 round 2 (25 s) | PASS |
| 8 | Guest /next denied | 403 | 403 “Only the host can do that.” | PASS |
| 9 | Restore: phone reaches round 2 | Prior total 23, blank answer, no correction, no host Next | Total 23, blank input, 0 corrections, 0 Next buttons | PASS |
| 10 | Old round-1 PUT after round 2 starts | 409, nothing stored | 409 “Time is up…” (deadline of round 2 had passed by then); no round-2 answer stored | PASS (note: not the “previous round” branch) |
| 11 | Round 2 unaccepted draft near deadline | No late acceptance | Not executed as planned: the draft fill failed after round 2 expired; round 2 ended with no guest1 answer | NOT TESTED |
| 12 | Late round-2 PUT | 409, no score | 409 “Time is up. Answers are closed.”; round-2 myAnswer null | PASS |
| 13 | Round 3: offline DIVE with draft `Typed while offline` | Not accepted; error shown | Fault log: PUT /answer `offline`; alert “Could not confirm your answer…”; no lock; draft kept | PASS |
| 14 | Restore after deadline | Revealed round 3, no answer, total 23 | Revealed, “No answer this round”, total 23, no Next; server myAnswer null, total 23 | PASS |
| 15 | Reload with GET room 503 | “Reconnecting to your seat.”, not join form | Reconnect card shown; join inputs 0; no “Your old seat expired” text | PASS (see observation A) |
| 16 | Restore GET, recover seat | Original seat, total 23 | After clearing 503 and waiting: code S27BJH, total 23, round-3 results, no join form | PASS |
| 17 | Round 4 offline timer, round 5 restore | Round 5 reached, total 23, blank | Round 5 reached (“PROMPT 5 OF 7”), blank input, total 23, no Next, no alert | PASS |
| 18 | Guest /next in round 5 | 403 | 403 | PASS |
| 19 | Old round-4 PUT after round 5 | 409, no round-5 answer | 409 “That answer belongs to a previous round…”; server round 5 myAnswer null, total 23 | PASS |

Score integrity (API): guest1 total stayed exactly 23 from round 1 through round 5. Round 1 = 23 (Bruno Mars, Sago Pearl, 20 base + 3 speed). Rounds 2, 3, 4: no accepted answer, 0 points. Host standings for round 1: Guest one 23, Guest two 0.

## Observations and gaps
- **A (UX, not a join-form regression):** During the 503 window, the page alternated between the “Reconnecting to your seat.” card (12 of 20 samples) and the loading skeleton (8 of 20). The join form and “Your old seat expired” text never appeared. Likely cause: react-query `isError` toggles during retries, so `!room && roomQuery.isError` is false between attempts and the skeleton renders. Worth a look.
- **B (timer, round 1):** The planned offline-near-deadline step was not executed as designed; the phone went offline after the round-1 deadline. Round 4 covers the in-round offline timer requirement.
- **C (refresh):** A refresh while the round-1 answer was locked was NOT performed, so “refresh preserves same accepted answer/reward/total” is unverified for round 1. Only the round-3 503 reload and seat recovery were covered.
- **D (round 2):** Planned unaccepted-submit-near-deadline in round 2 was not run; the equivalent was run in round 3 (item 13–14).
- **E (duplicate/old-round branches):** Duplicate and old-round PUTs were rejected by the deadline check (409 “Time is up”), not by the “already locked” / “previous round” branches, because the deadlines had passed.
- **F (notebook limits):** No `page.route` or `waitForFunction` in this notebook; interruptions were fetch-level. Screenshots were captured as observation images only and are not saved as binaries in this folder.

## Follow-up run: fresh room E9VVX4 (required checks only)
Room `E9VVX4` was created for this follow-up. Guest2 stayed unanswered throughout round 1 and round 2. Credentials are not stored.

| # | Check | Observed (exact) | Status |
|---|-------|------------------|--------|
| F1 | Start, lowercase `bruno mars` typed, response dropped after real forwarding; acceptance < 10 s | start 200; `roundEndsAt - roundStartedAt` = 25000 ms; accepted at 144 ms; server myAnswer `Bruno Mars` (canonical); reward points 40 (base 20, speed 20, elapsedMs 597, matched true); total 40; fault log PUT `response-aborted-after-forward`, serverStatus 200 | PASS |
| F2 | Immediate refresh | Pre-refresh and post-refresh server reward identical (points 40, base 20, speed 20, elapsedMs 597, matched true), myAnswer `Bruno Mars`, total 40; phone locked with `Bruno Mars`, input absent, no correction, no alert | PASS |
| F3 | Duplicate PUT before deadline, guest2 unanswered | 409 `Your first answer is already locked for this round.`; server reward (40 / 20 / 20 / 597) and total 40 unchanged; phase still answering | PASS |
| F4 | Round 2 valid bank answer, online until endsAt - 3 s, then offline incl. submit | Draft `Burger King` (in bank for round 2). Offline click at 2911 ms before deadline: fault log PUT /answer `offline`; alert `Could not confirm your answer…`; no lock; draft kept | PASS |
| F5 | Offline through deadline; local timer does not reset | Local timer read `Time` on every 500 ms sample for 6 s after the deadline (no value rose); locked not shown | PASS |
| F6 | Host advances while guest blocked | Host read: phase revealed, round 2; reveal ok; next 200 round 3, answering, durationMs 25000 | PASS |
| F7 | Release; blank next question; cumulative points unchanged; no queued acceptance | Phone: `PROMPT 3 OF 7`, input blank, no correction, no Next control, total 40, no alert. Server: round 3, myAnswer null, total 40. Late round-2 PUT `Burger King` → 409 `That answer belongs to a previous round…`; no round-2 answer was stored | PASS |

Notes on the follow-up:
- After the immediate reload (F2), the HUD SCORE read `0` at about 800 ms while the server total was 40. About 10 s later the HUD read `SCORE 40` and `DEPTH 20`. This transient was not re-checked after a longer wait; it needs review. No score or server value changed.
- F2/F3 reward equality is established by comparing the printed server values, not by an automated assertion. The first automated comparison in the duplicate cell was a comparison artifact (it compared a fuller object), and the later round-1 comparison ran after round 2 started, where `myReward` is null by design.
- The phone's server timer span was checked in the API output (round 1 and round 2 and round 3, each 25000 ms).

Extra room created by mistake: while validating the Node helper I ran `create` once (output discarded). The resulting room is **3ZEKGK** (DB row confirmed by a read-only query). It has no game activity. Please delete it with the other test rooms if cleanup is required. No endpoint for deletion exists.

Test rooms for cleanup: `S27BJH` (first journey), `E9VVX4` (follow-up), `3ZEKGK` (accidental, empty).

## Repeatable scripts
- `phone-recovery.fault-init.js`: install once per context with `context.addInitScript(...)`. Toggle from the page through `window.__faultControl.set({ offline | room503 | dropAnswerResponse })`, `.reset()`, and read `.log()`. Flags are stored in sessionStorage so reloads keep them.
- Use the existing API smoke harness (`artifacts/api-server/src/testing/party-smoke.ts`) for independent seven-round scoring, refresh, duplicate and permission assertions. The temporary manual API helper was not retained; it was not an automated browser test.

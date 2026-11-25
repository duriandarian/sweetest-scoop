# Published party capacity assessment

## November 21 Preview rehearsal and stuck-answer recovery

| Measurement | 30 simulated guests | 40 simulated guests |
| --- | ---: | ---: |
| Successful joins | 30/30 | 40/40 |
| Join latency, p95 | 373 ms | 252 ms |
| Questions delivered before opening | 240/240 | 320/320 |
| Smallest lead before opening | 105 ms | 92 ms |
| Room refresh latency, p95 | 110 ms | 85 ms |
| Answer confirmation latency, p95 | 409 ms | 474 ms |

Both disposable rooms finished eight rounds with zero failures. A separate 390px Chromium test simulated a request and room refreshes that never replied. The answer form recovered after about four seconds, preserved the draft, and accepted a manual retry without a page refresh. A second test forwarded the answer, withheld the reply, and verified that the phone recovered the locked answer and correct cumulative score without automatically resending. These are development checks, not another production rehearsal or a measurement of venue Wi-Fi.

## Preview: guest connection and question timing

The development-only rehearsal now tracks the first question snapshot for each guest in each round, using the app's foreground polling cadence. Both groups joined successfully, authenticated back into distinct seats, saw the same lobby roster, and received every question before the server's scheduled opening. Every guest also received each round result and the same final standings.

| Measurement | 40 simulated guests | 50 simulated guests |
| --- | ---: | ---: |
| Successful joins | 40/40 | 50/50 |
| Join latency, p95 | 344 ms | 317 ms |
| Questions delivered before opening | 320/320 | 400/400 |
| Smallest lead before opening | 112 ms | 114 ms |
| Room refresh latency, p95 | 85 ms | 103 ms |
| Answer confirmation latency, p95 | 392 ms | 442 ms |

Both groups completed all eight rounds with zero failures and exactly one accepted answer per player per round. The response measurements are development HTTP timings, not phone screen measurements. The narrowest head start leaves little room for extra delay; these results do not establish responsiveness on the published deployment or on venue Wi-Fi.

## November 20 live rehearsal result

The approved, single-room rehearsal at `22:57:33–22:58:04 UTC` did **not** pass. The five-guest lobby pilot passed, then all 40 synthetic guests joined. The rehearsal stopped on round one when rolling p95 room reads crossed the three-second stop threshold during a simultaneous answer burst. No deployment settings were changed, no further load was sent after the stop, and no live test records were manually deleted.

| Measurement | Result |
| --- | --- |
| Joins | 40 successful; 1.96 s p95 |
| Room reads | 396 attempts including cancellations; 0.42 s median and 4.34 s p95 |
| Answers | 40 launched, eight validated acknowledgements before abort; no verdict on the others |
| HTTP | 478 attempts total; 406 recorded 2xx responses, no recorded non-2xx responses or timeouts; outstanding requests were aborted |
| Rounds completed | 0 |

The aborted answer timings do not measure normal answer latency. The deployment reported one observed instance, with 2 vCPUs and 4 GB configured per instance; the configured maximum and resource use during the burst were not available. This does not isolate the cause of the slowdown. Separate Preview runs finished all eight rounds with 40 and 50 guests, but neither those runs nor this rehearsal tested venue Wi-Fi.

## November 18 assessment (historical)

Assessment date: November 18, 2026, Pacific time (November 19 UTC).

## Decision

**Encouraging historical performance, but 40-person production capacity is not yet established.**
No production load test, room creation, data change, credential access, or deployment change was performed for this assessment.
The user confirmed that the latest changes are published.

## Published configuration

- Verified production URL: https://duriandarian.replit.app
- Public Autoscale deployment; current build reports success.
- Latest build observed: created November 19 at 06:31:02 UTC; successful at 06:32:24 UTC.
- Machine configuration: `cr-2-4`, 2 vCPUs, memory value `4` (4 GB machine tier).
- **Maximum machine count: unknown.** The available build metadata does not expose it, and the user did not supply it. Check Publishing → Adjust settings → Max machines before any rehearsal.
- No machine size or scaling changes are recommended from these low-load observations alone.

Sources: deployment metadata and read-only deployment metrics; Replit's
[machine configuration](https://docs.replit.com/features/publishing/machine-configuration)
and [monitoring](https://docs.replit.com/features/publishing/monitoring-a-deployment) documentation.

## Production evidence

Historical observation window: **2026-11-18 06:50:35.983 UTC through 2026-11-19 06:50:35.983 UTC**.
This spans multiple published versions; it is not a benchmark of only the latest build.
Percentiles are approximate platform aggregates.

| Measurement | Observation |
| --- | --- |
| Total reported requests | 2,081 |
| Overall latency p50 / p95 / p99 | 420 / 587 / 894 ms |
| Main normalized room-read endpoint | 1,437 requests; p95 770 ms |
| Main normalized answer endpoint | 34 requests; p95 1,650 ms; p99 2,330 ms |
| Main normalized next-round endpoint | 11 requests; p95 975 ms |
| Room creation | 6 requests; p95 2,388 ms |
| Main normalized join endpoint | 5 requests; p95 2,125 ms |
| CPU utilization p95 | 2.94% of allocated limit |
| Memory utilization p95 | 2.83% of allocated limit |
| Container startup latency p95 | 2,272 ms |
| Latest active instance count | 0; an idle observation, not the configured scaling maximum |

Endpoint telemetry also contains literal room paths alongside normalized routes.
The normalized rows above therefore do not include every request of that type.
Small write-endpoint samples cannot establish simultaneous answer-burst behavior.
Startup latency is separate from warm request latency and should not be added to every request.

### Error-data limitations

- Aggregate 4xx count: 4.
- The main normalized room-read endpoint alone reports 28 4xx responses.
- The aggregate 5xx query returned **no points**, not a measured zero.
- Every returned endpoint row reports zero 5xx responses.

These sources do not reconcile, so there is no defensible combined error rate.
There is no claim here that production is error-free, nor an inferred cause for the 4xx responses.
CPU and memory headroom describe historical traffic only, not capacity at 40 concurrent guests.

## Development evidence — separate from production

The task's supplied prior evidence records successful seven-round local HTTP simulations
with **40 and 60 guests**. The test checks concurrent joins, ongoing polling, answer
bursts, private snapshots, cumulative scores, and round progression.
Raw latency results from those earlier runs were not supplied to this assessment;
no development latency figures are invented here.

The local test is `artifacts/api-server/src/testing/crowd-smoke.ts`.
It is deliberately development-only and uses local database access for setup/cleanup.
**Do not repoint it at production, remove its local-only boundary, or copy credentials.**
No new simulation was run during this assessment.

### Three-second round-start buffer verification (development)

- The seven-round smoke test checked a guest refresh during the first buffer
  and after the second round opened. Both used the original host timestamps.
  Early submissions were rejected without scoring, retries kept the same
  schedule, and the timed window remained 25 seconds.
- A headless Chromium check at desktop and 390px phone widths verified that
  Start and Next show Get ready without a prompt or answer input, then open
  the timed question and show results after the guest answers.
- A separate 40-guest development simulation completed all seven rounds,
  including 280 accepted submissions, with no failures. Background room reads
  had a 150 ms p95; answer acknowledgements had a 508 ms p95. These results
  describe local development HTTP, not published capacity or venue Wi-Fi.

## Original production rehearsal proposal (historical)

The user has confirmed that the latest version is published.
The following is a proposal only. A separate, explicit approval is required before
generating production load or creating production test records.

### Preconditions and approval

1. Recheck the serving build and record the actual maximum machine count in Publishing settings.
2. Choose a quiet window with no real game underway; do not change deployment settings.
3. Obtain approval for **one room, one host, at most 40 synthetic guests, seven rounds,
   ten minutes maximum, and 15,000 HTTP requests maximum**, plus the synthetic records
   this creates. Stop at whichever limit occurs first.
4. Explain retention before approval: no room-deletion HTTP route was found in the current
   room router. The room, players, and answers may remain after the rehearsal. Do not promise
   automatic cleanup or use direct production database deletion. Any later cleanup needs
   separately authorized, narrowly scoped handling.

Suggested approval wording:

> I approve one production rehearsal on the confirmed published version: one test room,
> one host and up to 40 synthetic guests, seven rounds, at most ten minutes and 15,000
> requests, with synthetic records retained. No deployment changes or deletion.

### Execution boundaries

- Use a purpose-built, production-safe client through normal public application HTTP
  endpoints only. Do not adapt or run the local-only crowd script.
- Create new synthetic sessions; never read/copy existing credentials, host sessions,
  player tokens, or real rooms. Keep newly issued test-session tokens in memory only;
  never print them or include them in evidence files.
- Clearly label test players and use only the newly created test room.
- Start with five guests for a lobby/join/read pilot only; do not start a round.
  Verify the host and guest rosters agree and authenticated reads succeed. Stop if
  the pilot fails; otherwise join the remaining 35 guests while the room is still
  in the lobby. Verify all 40 are present, then start and complete all seven rounds.
  The application rejects new joins after the game starts, so do not stage guest
  additions across rounds. The lobby pilot shares the same ten-minute/request budgets.
- Match normal polling: guests every 1.5–1.9 seconds while answering, host about every
  second, and 2.5–2.9 seconds between rounds. Do not accelerate gameplay deadlines.
  At 40 guests this implies roughly 22–28 background reads/second while answering,
  plus one answer per guest per round and normal host actions.
- Include simultaneous answers when all 40 guests are present. Do not retry failed writes
  automatically, run repeated trials, or escalate to 60 guests.
- Enforce the wall-clock and request budgets centrally; stop all polling on exit or failure.

### Stop and acceptance criteria

- Stop immediately on an unexpected HTTP error, timeout, lost/duplicate score, incorrect
  participant count, or any effect outside the test room. Record the failure; do not rerun.
- Stop if rolling 60-second p95 room reads or answer acknowledgements exceed 3 seconds
  with at least 20 samples, or if CPU/memory exceeds 80% for two consecutive available
  one-minute observations. These are proposed conservative rehearsal limits, not platform guarantees.
- Pass only if all seven rounds finish, each accepted synthetic answer scores exactly once,
  all clients converge on final standings, no unexpected errors occur, and room-read and
  answer-acknowledgement p95 stay below 3 seconds.
- Report joins, reads, answers and controls separately, including sample counts, p50/p95/p99,
  maximum latency, status codes, timeouts, observed machine count and available resources.
  Preserve only redacted aggregate evidence and the tested build/time window.
- Even a pass supports only this bounded scenario, not unrestricted capacity or venue readiness.

## Remaining venue Wi-Fi limitations

A remote HTTP rehearsal does not test forty physical phones sharing an access point,
captive portals, weak signal, radio congestion, venue uplink capacity, browser rendering,
or simultaneous image/audio downloads. Server latency also excludes some device/network delay.

A separate on-site rehearsal should use the actual host display and representative phones
on the venue guest network, ideally all forty at once. Check lobby entry, assets/audio,
simultaneous answers, perceived round changes, and an agreed cellular/hotspot fallback.
If fewer devices participate, record that limit rather than calling the venue validated.
Phone lock/app-switch recovery and lost-response host controls are separate existing work.

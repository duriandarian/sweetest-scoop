# The Sweetest Scoop

A multiplayer mango-sago party game for Daniel and Amy’s engagement party at Meet Fresh. Guests join without accounts, customize Bobi, and answer eight timed questions. Niche answers earn higher dessert-tier points, with a time-based bonus of up to 20.

The homepage is a persistent personal photo menu with Bobi and gently moving dessert ingredients in Meet Fresh / mango-sago café colors. There is no standalone drink, visible motion control, intro, or automatic tutorial; system reduced-motion preferences are respected. **Create room** opens host setup; **Join room** opens player setup.

Under **Create room**, choose **Party game** for the original questions, or **Custom game** to paste a spreadsheet with one row per answer: `Question`, `Answer`, and `Dessert tier`. Use **Copy spreadsheet template** for a working example and **Preview questions** before creating the room. Leave the Question cell blank to continue the previous question. Supported tiers are Sago Pearl, Mango Cube, Pomelo Gem, Coconut Cloud, and Golden Mango. Custom rooms accept up to 10 questions and keep their own bank until the room expires.

## Setup

This project uses the Replit PostgreSQL database and the shared API server.

1. Install workspace dependencies with `pnpm install`.
2. Set the required environment variable `DATABASE_URL` for PostgreSQL. Replit provides it for the workspace database.
3. Apply the development schema with `pnpm --filter @workspace/db run push`.
4. Start the API server with `pnpm --filter @workspace/api-server run dev`.
5. Start the web app with `pnpm --filter @workspace/sweetest-scoop run dev`.

The web and API artifact workflows provide their own `PORT` and `BASE_PATH` values. Do not add database credentials to source control.

## Play

- Open the app and create a host room, or enter the code on the host screen to join. After one hour without a join, accepted answer, or other saved game action, the room expires. Refreshing the screen does not reset the clock. Cleanup removes expired rooms, answers, scores, and sessions, and their codes can be reused.
- The host is a moderator, not a competing player. At least one guest must join.
- The visual-only fitting room offers six colors, twenty-two hat choices, twenty-four outfit choices, and twelve extras (including removal options), with 38,016 mix-and-match combinations. Item names are available to screen readers rather than printed under tiles. Choices are free, preview live, and are saved when creating/joining or changing your lobby profile. Saved outfits appear on the host screen, in private dives, and on podiums; existing presets and outfit tokens remain supported. Every new round has a 25-second maximum, enforced by the server.
- Each guest submits **one locked answer per round**. No edits or second attempts.
- During a round, phones show the prompt and answer entry. After submitting, each guest sees their own Bobi reward dive, private score breakdown, and updated cumulative points. The host sees whose Bobis have dropped in to indicate a submission, never their answer text or current-round points.
- The host has a large countdown and automatically playing original synthesized round music, building in the final ten seconds. When results open it transitions back to café music. Guest phones remain silent during the game.
- Results open automatically when every guest has accepted an answer, or at the 25-second server deadline, whichever comes first. Both screens show the cumulative top five, every guest's latest answer and score breakdown, cumulative standings, and the complete answer bank with tier filters and search.
- Only the host advances rounds. After the last round, the final screen shows the cumulative podium and honorable mentions instead of the last answer bank. There is no shared score.
- **Practice** at `/solo` uses the full-screen player-question scene: Bobi starts at the surface, with one accepted answer and a 25-second countdown beside the bottom input. The timer starts automatically after a one-second prompt-reading pause. Typing and rejected attempts never restart it. The server checks the current question's prepared list, including conservative typo forgiveness, and returns its actual ingredient, depth and practice points. Unlisted answers return HTTP 200 with `matched: false` and show a normal inline try-again hint, without exceptions, locked drafts, points or dives. The manual example-depth selector has been removed. Practice speed points use the submitted elapsed time for illustration only; no rooms, answers or scores are saved. After submission or expiry, Try again and Next question open a fresh attempt. Deeper ingredients and tiers remain undiscovered until landing.
- **Question preview** at `/preview/question` opens the same server-checked phone practice with the game soundtrack. Expiry preserves the draft; Try again explicitly starts a fresh attempt. Switch to the host preview to inspect submission status with a paused timer. `/preview/question?screen=host` opens the host version directly; add `&guests=40` for a clearly labeled 40-person layout fixture. These are sample Bobis, not saved multiplayer guests.

## Scoring

Rarity comes from the supplied spreadsheet, **not** other players' answers:

| Spreadsheet group | Dessert prize | Base points |
| --- | --- | --- |
| Plankton or Too Clever | Sago Pearl | 20 |
| Schooler | Mango Cube | 40 |
| Rare | Pomelo Gem | 60 |
| Deep Cut | Coconut Cloud | 80 |
| Krillion | Golden Mango | 100 |

Matching answers earn `base + round(20 × (1 − elapsedMs / durationMs))`, with speed clamped to 0–20. Only server time is used. Unlisted answers earn zero including no speed bonus. A player's own reward and private total are available after submission; other players' answers, current-round scores, and the answer bank remain hidden until everyone answers or the deadline expires. Dessert tiers reflect rarity only; a speed bonus never changes the tier.

Matching ignores case, whitespace, punctuation and accents. Exact prepared answers always win. For keys of at least four characters, one missing, extra, wrong or adjacent-swapped letter produces a correction only if exactly one prepared answer matches. The player sees original → corrected, the input adopts the corrected spelling, and a second submit confirms it; editing is also allowed. Suggestions return HTTP 200 without saving an answer, awarding points, revealing a tier or restarting the deadline. Speed points use the time of the confirmed submission. Accepted answers display and store the canonical spelling. Ambiguous, partial and substantially different answers are not guessed. Scoring stays server-side; existing saved answers and scores are not rewritten. Catalog duplicates normalize to one entry (lowest tier wins if conflicting columns are introduced). Round ties use faster server submission, then display name and player ID. Cumulative ties use display name and player ID.

Numbered tabs are snapshotted in `artifacts/api-server/src/data/party-questions.json`. The browser receives a separately generated list of prompts for Practice, not the answer bank. To refresh the bank, download the workbook as XLSX, preserve the current snapshot under its bank version, and run `python scripts/import-party-questions.py path/to/workbook.xlsx`. Register the archived snapshot and increment the current bank version in `party-scoring.ts` before publishing the update. New rooms use the latest bank; rooms from the previous seven-round bank continue to use that snapshot, including its original answer tiers. A cell with pipe-separated alternatives (such as `soup dumplings | xlb`) accepts either exact wording in new rooms and counts both under one answer.

## Music

Music attempts to autoplay on arrival. Browsers that block audible autoplay start it on the first tap, click or keypress instead, without a separate play button. The original instrumental café loop continues through host setup and the lobby. Questions crossfade into an original synthesized party beat at 128 BPM, building to 160 BPM in the final ten seconds, then return to café music for results. Playback uses one audio context across navigation. Guest phones are silenced when they enter a room.

There are no in-app mute or volume controls; playback uses a fixed moderate level and the device's own sound controls. Old saved mute/volume choices are no longer used. Phone practice uses the party beat from entry, speeding up in the final ten seconds of a running attempt. The packaged café loop is original generated music, not a licensed commercial track; the party arrangement is synthesized locally and does not use Kahoot recordings. No music API keys or runtime generation service are required.

## Verification

### Forty-player party readiness

`pnpm --filter @workspace/api-server exec tsx src/testing/crowd-smoke.ts 40`

With both development workflows running, this creates one disposable database-backed room, joins 40 guests concurrently, keeps independent host/phone polls running, and submits all 40 answers in a burst in each round. It verifies private answering-state snapshots, exact cumulative scores, early reveal, and host-driven progression. It reports request counts and median/p95/maximum HTTP latency, with a development p95 acceptance threshold of three seconds. The room and its test players/answers are deleted in `finally`; no session tokens or database contents are recorded in files. An optional count, such as `60`, checks additional headroom.

The test deliberately targets only the local development proxy. It is not a physical-phone test, a production capacity guarantee, or a venue Wi-Fi test. Rehearse on the published app and venue network before the event.

Room refreshes use coherent read-only database snapshots, not room write locks. Accepted answers and host changes still use the room lock. Guest polling is staggered to avoid synchronized refreshes, and finished rooms stop polling. The host's large-group view uses a compact cup with bounded scrolling and a horizontally scrollable waiting strip.

`pnpm --filter @workspace/api-server exec tsx --test ../sweetest-scoop/src/game/music-session.test.ts ../sweetest-scoop/src/game/round-music.test.ts` checks soundtrack crossfades, guest silence, mute/loading races, urgency, volume recovery, stale transitions, and audio cleanup.

`pnpm run typecheck` checks all workspace packages. `pnpm --filter @workspace/api-server exec tsx --test src/lib/party-scoring.test.ts` checks all prepared answer rewards, normalization and speed scoring.

`pnpm --filter @workspace/api-server exec node src/testing/discovery-visibility.mjs` renders the real player, practice, and lobby components without a browser or API calls. It verifies that waiting players and practice controls contain no ingredient-tier spoilers and that rewards are not named before landing. The runner handles exact-case module resolution for the standalone UI bundle.

`pnpm --filter @workspace/api-server exec tsx --test src/testing/avatar-validation.test.ts ../sweetest-scoop/src/game/wardrobe.test.ts` validates every wardrobe combination, compact token round trips, legacy compatibility, and rejection of invalid parts. Appearance tokens remain within the existing storage limit; no database migration is required.

With the managed API workflow running, `pnpm --filter @workspace/api-server exec tsx src/testing/party-smoke.ts` exercises the full game through HTTP, including permissions, private answers, profile persistence, deadline enforcement, immutable submissions and standings. It creates and removes only its own test room, and shortens only that room's deadlines to keep the run fast.

With both the managed API and web workflows running, `pnpm --filter @workspace/api-server exec tsx src/testing/lobby-invite-smoke.ts` decodes a real host QR and verifies the join flow in Chromium. It uses only disposable rooms in the development database. Set `CHROMIUM_PATH` if the `chromium` command is not on your PATH.

`pnpm --filter @workspace/api-server exec tsx src/testing/custom-room-smoke.ts` plays a disposable custom game in a desktop host browser and a phone-sized player browser. It covers invalid rows, draft and room reloads, bank privacy and isolation, scoring, catalog filters, and final standings.

## Privacy

Guest and host sessions use random room tokens saved in local storage so refreshes restore the seat. Only token hashes are stored in PostgreSQL. Players can see their own locked answer and reward immediately; other answers and the answer catalog are withheld until expiry. Host permissions, deadline checks, one-answer limits, and round identity are enforced on the server with transactional room locks. Answers outside the current question's prepared list are rejected before storage, with no reward or submission recorded; guests can correct them before the unchanged server deadline. Once a valid answer is accepted, it cannot be changed.

An unlisted multiplayer answer also returns HTTP 200 with transient `answerFeedback` and an unchanged, unlocked room state. This is normal gameplay, not an HTTP error or exception. Request-format, permission and deadline failures retain their appropriate error responses.

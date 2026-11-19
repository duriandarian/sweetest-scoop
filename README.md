# The Sweetest Scoop

A multiplayer mango-sago party game for Daniel and Amy’s engagement party at Meet Fresh. Guests join without accounts, customize Bobi, and answer seven timed questions. Niche answers earn higher dessert-tier points, with a time-based bonus of up to 20.

The homepage is a persistent personal photo menu with Bobi and gently moving dessert ingredients in Meet Fresh / mango-sago café colors. There is no standalone drink, visible motion control, intro, or automatic tutorial; system reduced-motion preferences are respected. **Create room** opens host setup; **Join room** opens player setup.

## Setup

This project uses the Replit PostgreSQL database and the shared API server.

1. Install workspace dependencies with `pnpm install`.
2. Set the required environment variable `DATABASE_URL` for PostgreSQL. Replit provides it for the workspace database.
3. Apply the development schema with `pnpm --filter @workspace/db run push`.
4. Start the API server with `pnpm --filter @workspace/api-server run dev`.
5. Start the web app with `pnpm --filter @workspace/sweetest-scoop run dev`.

The web and API artifact workflows provide their own `PORT` and `BASE_PATH` values. Do not add database credentials to source control.

## Play

- Open the app and create a host room, or join using its six-character code.
- The host is a moderator, not a competing player. At least one guest must join.
- The visual-only fitting room offers six colors, fourteen hat choices, twelve outfit choices, and twelve extras (including removal options), with 12,096 mix-and-match combinations. Item names are available to screen readers rather than printed under tiles. Choices are free, preview live, and are saved when creating/joining or changing your lobby profile. Saved outfits appear on the host screen, in private dives, and on podiums; existing presets and outfit tokens remain supported. Every new round is fixed at 25 seconds, enforced by the server.
- Each guest submits **one locked answer per round**. No edits or second attempts.
- During a round, phones show the prompt and answer entry. After submitting, each guest sees their own Bobi reward dive, private score breakdown, and updated cumulative points. The host sees whose Bobis have dropped in to indicate a submission, never their answer text or current-round points.
- The host has a large countdown and automatically playing original synthesized round music, building in the final ten seconds. At the deadline it transitions back to café music. Guest phones remain silent during the game.
- Results open automatically at the server deadline, showing the round's top three, every guest's answer and score breakdown, cumulative standings, and the complete answer bank with tier filters and search.
- The host advances rounds, then opens the final individual leaderboard after round seven. There is no shared score.
- **Practice** at `/solo` uses the full-screen player-question scene: Bobi starts at the surface, with one accepted answer and a 25-second countdown beside the bottom input. In practice only, the timer starts with the first nonblank edit, not on page load. The server checks the current question's prepared list, including conservative typo forgiveness, and returns its actual ingredient, depth and practice points. Invalid answers display an error without locking the draft, granting points or starting a dive. The manual example-depth selector has been removed. Practice speed points use the submitted elapsed time for illustration only; no rooms, answers or scores are saved. After submission or expiry, Try again and Next question open a fresh attempt. Deeper ingredients and tiers remain undiscovered until landing.
- **Question preview** at `/preview/question` opens the same server-checked phone practice with the game soundtrack. After expiry another nonblank edit starts a fresh 25-second attempt instead of disabling the practice input. Switch to the host preview to inspect submission status with a paused timer. `/preview/question?screen=host` opens the host version directly.

## Scoring

Rarity comes from the supplied spreadsheet, **not** other players' answers:

| Spreadsheet group | Dessert prize | Base points |
| --- | --- | --- |
| Plankton or Too Clever | Sago Pearl | 20 |
| Schooler | Mango Cube | 40 |
| Rare | Pomelo Gem | 60 |
| Deep Cut | Coconut Cloud | 80 |
| Krillion | Golden Mango | 100 |

Matching answers earn `base + round(20 × (1 − elapsedMs / durationMs))`, with speed clamped to 0–20. Only server time is used. Unlisted answers earn zero including no speed bonus. A player's own reward and private total are available after submission; other players' answers, current-round scores, and the answer bank remain hidden until the deadline. Dessert tiers reflect rarity only; a speed bonus never changes the tier.

Matching ignores case, whitespace, punctuation and accents. Exact prepared answers always win. For keys of at least four characters, one missing, extra, wrong or adjacent-swapped letter is forgiven only if exactly one prepared answer matches. Ambiguous, partial and substantially different answers are not guessed. Scoring stays server-side; original submitted text is preserved, while the revealed catalog groups credited typos with the canonical answer. Existing saved scores are not recalculated. Catalog duplicates normalize to one entry (lowest tier wins if conflicting columns are introduced). Round ties use faster server submission, then display name and player ID. Cumulative ties use display name and player ID.

The seven tabs are snapshotted as application content in `artifacts/api-server/src/data/party-questions.json`. Updating the live sheet does not silently change an active game. To refresh the bank, download the workbook as XLSX and run `python scripts/import-party-questions.py path/to/workbook.xlsx`, review the diff, and restart the API. Do not replace the bank during active games; create new rooms after a bank revision. Older rooms and stored answers are retained, but older lobby rooms must be replaced with a new room to start the seven-round format.

## Music

Music attempts to autoplay on arrival. Browsers that block audible autoplay start it on the first tap, click or keypress instead, without a separate play button. The original instrumental café loop continues through host setup and the lobby. Questions crossfade into an original synthesized party beat at 128 BPM, building to 160 BPM in the final ten seconds, then return to café music for results. Playback uses one audio context across navigation. Guest phones are silenced when they enter a room.

There are no in-app mute or volume controls; playback uses a fixed moderate level and the device's own sound controls. Old saved mute/volume choices are no longer used. Phone practice uses the party beat from entry, speeding up in the final ten seconds of a running attempt. The packaged café loop is original generated music, not a licensed commercial track; the party arrangement is synthesized locally and does not use Kahoot recordings. No music API keys or runtime generation service are required.

## Verification

`pnpm --filter @workspace/api-server exec tsx --test ../sweetest-scoop/src/game/music-session.test.ts ../sweetest-scoop/src/game/round-music.test.ts` checks soundtrack crossfades, guest silence, mute/loading races, urgency, volume recovery, stale transitions, and audio cleanup.

`pnpm run typecheck` checks all workspace packages. `pnpm --filter @workspace/api-server exec tsx --test src/lib/party-scoring.test.ts` checks all prepared answer rewards, normalization and speed scoring.

`pnpm --filter @workspace/api-server exec node src/testing/discovery-visibility.mjs` renders the real player, practice, and lobby components without a browser or API calls. It verifies that waiting players and practice controls contain no ingredient-tier spoilers and that rewards are not named before landing. The runner handles exact-case module resolution for the standalone UI bundle.

`pnpm --filter @workspace/api-server exec tsx --test src/testing/avatar-validation.test.ts ../sweetest-scoop/src/game/wardrobe.test.ts` validates every wardrobe combination, compact token round trips, legacy compatibility, and rejection of invalid parts. Appearance tokens remain within the existing storage limit; no database migration is required.

With the managed API workflow running, `pnpm --filter @workspace/api-server exec tsx src/testing/party-smoke.ts` exercises all seven rounds through HTTP, including permissions, private answers, profile persistence, deadline enforcement, immutable submissions and standings. It creates and removes only its own test room, and shortens only that room's deadlines to keep the run fast.

## Privacy

Guest and host sessions use random room tokens saved in local storage so refreshes restore the seat. Only token hashes are stored in PostgreSQL. Players can see their own locked answer and reward immediately; other answers and the answer catalog are withheld until expiry. Host permissions, deadline checks, one-answer limits, and round identity are enforced on the server with transactional room locks. Answers outside the current question's prepared list are rejected before storage, with no reward or submission recorded; guests can correct them before the unchanged server deadline. Once a valid answer is accepted, it cannot be changed.

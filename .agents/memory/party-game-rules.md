---
name: Party game rules
description: User decisions for the spreadsheet-based party game
---
The live game uses the supplied spreadsheet's numbered tabs for timed rounds, prepared answers, and rarity groups, not the frequency of guests' answers. The updated workbook has eight rounds.

**Why:** The user requested a Krillion-inspired question-and-prize game themed around Meet Fresh and mango sago, with points for niche answers and speed.

**How to apply:** Keep answer classification server-side and distinct from the illustrative homepage story. Use server timing for scoring, never browser-supplied elapsed times. Retain the original bank when a new workbook reorders or replaces questions so existing rooms and stored rewards are not reinterpreted.

The engagement-party game must account for a "BIG GROUP": the user expects 40–50 simultaneous players for the event.

**Why:** The user explicitly emphasized large-group support and specified 40 people playing at once.

**How to apply:** Verify the expected crowd size, including overlapping answer bursts and room refreshes, before claiming capacity. Distinguish development simulations from production and venue connectivity: a fast Preview run does not establish published answer-burst performance. Keep the host display usable for the whole group.

On the projected question screen, prioritize the prompt, seconds left, and total answered, in that order. Keep the full cup and all guest Bobis.

**Why:** The user wants those three details legible from across the room, with individual names as a detail for people closer to the display.

**How to apply:** Use one high-contrast timer; do not duplicate it in the room header. Treat name tags as secondary, and wrap the lineup rather than truncating the crowd.

Each multiplayer round has a 25-second maximum; practice has a 25-second countdown.

**Why:** The user explicitly said "it should be 25 seconds each."

**How to apply:** Keep multiplayer deadlines, practice resets, countdowns, and speed-bonus timing consistent with 25 seconds. Do not offer longer round-length choices. Live rounds have a separate, shared three-second “Get ready” buffer; the timed question and answer input open when it ends.

**Why the buffer is separate:** The user requested three seconds to give phones a chance to pick up the new round, not to take time away from answering or give each phone its own deadline.

End a multiplayer round immediately when every guest has locked in a valid answer, or when the 25-second deadline expires, whichever comes first. The host still starts the next question.

**Why:** The user explicitly chose "Show results immediately" after confirming the old behavior waited for the full timer.

**How to apply:** Enforce completion on the server using accepted guest submissions only, excluding the host and unconfirmed corrections or invalid attempts. Reveal the cumulative podium and answer bank to both screens without waiting for a private dive to finish. Keep speed bonuses based on the original server start and 25-second duration.

Speed points must vary with how fast the player answers, with a 20-point maximum, not a fixed 20-point award. The maximum does not scale with answer rarity.

**Why:** The user clarified that "the speed points is variable, not set to 20," then confirmed "20 point maximum, just based on the timing of things."

**How to apply:** Show the actual calculated bonus in results and describe it as time-dependent; do not imply everyone receives 20 points.

There is no shared score. Each player submits one answer per round; the requested podium shows the top five Bobis, alongside a filterable catalog of all possible answers when the round ends.

**Why:** The user explicitly corrected the initial cooperative interpretation: "There is no shared score." They selected one answer per round.

**How to apply:** Every between-round podium ranks cumulative points across all completed rounds, not just that round's points. Keep the latest-round answer breakdown separate. Do not add shared/team scoring or permit repeated attempts. Keep the catalog hidden until everyone has answered or time expires.

**Why the podium is cumulative:** The user explicitly said it should not be "this round's top three" and should be an aggregate.

The final screen uses the same cumulative top-five podium plus a short honorable-mentions panel, not the last question's answer bank or full standings list.

**Why:** The user removed the final answer bank, then asked for side awards such as fastest and slowest replies.

**How to apply:** Keep the aggregate podium primary on both screens. Use accepted server-timed answers from the full game for the awards. The slowest accepted reply is called “Just in Time”; skipped or invalid guesses are not eligible. Keep the answer bank and round breakdowns on between-round screens only.

Treat spreadsheet "Too Clever" entries as lowest-tier answers. Guests customize their Bobi in the lobby.

**Why:** The user selected lowest-tier points for "Too Clever" and requested distinct player appearances when joining.

**How to apply:** Preserve the same recognizable uploaded character while providing saved appearance choices.

The host's lobby should show joining players' customized Bobis together in a shared mango-sago cup.

**Why:** The user asked for each player's Bobi to appear on the server screen as they join. They later called the mix of boba and mango-sago theming confusing and asked to align it.

**How to apply:** Use the actual live room roster and saved appearances; do not populate the shared cup with pretend players. Keep mango, coconut, pomelo and pale sago as the dessert theme; Bobi remains the tapioca-pearl mascot, not a reason to switch the drink to brown milk tea.

The host is only a moderator and should not have a personal Bobi or customization. Do not show the "Tonight's seven" question list or the long rules paragraph in the lobby.

**Why:** The user explicitly removed that block and said it does not make sense for the host to have their own Bobi.

**How to apply:** Keep Bobi customization for guests, guest-only Bobis in the roster and shared cup, and brief waiting/start controls. Keep the host's name and room-management permissions without treating the host as a player.

Keep the special outfits for guests using exactly “Daniel” or “Amy” (ignoring case and surrounding spaces) as a hidden Easter egg. Their look is automatic and locked, with no fitting room.

**Why:** The user wanted the couple’s Bobis to be a surprise rather than another customization option. They later said the outfits were doing too much and asked for a simpler look.

**How to apply:** Amy’s “Sweetheart Bobi” follows the Bruno Mars peace-sign reference: dark rounded curls, amber aviators, both hands raised, and pink hearts. Keep her matcha, volleyball, and little feet visible even when simplifying the outfit. Keep the rounded eyes visible within the fuller amber lenses, with the smile centered a little below them. No Disneyland jacket or bandana. Daniel’s “Main Character Bobi” has a light warm-tan pearl and chef hat, with no hoodie. His red, white, and blue kart faces straight ahead with a red “D,” not an “M,” and carries the volleyball. Only Daniel’s feet are hidden behind the kart. Use original costume art.

For existing seats, show the same exclusive outfit as a new join for those exact names, without resetting the room or rewriting saved seats.

Players answer on their phones, then see a private Bobi dive to the reward for their answer and an updated running total at the top left. The host screen shows the question and who has answered, not private answer content or a player's dive.

**Why:** After earlier removing all gameplay dives, the user explicitly reintroduced them on the playing screen: after writing an answer "they will dive like in Krillion" and see their total points. This supersedes the earlier no-diving rule for phones only.

**How to apply:** Reveal only the submitting player's own reward and total before round completion. Keep other answers, standings, and the catalog hidden until everyone has answered or time expires. At round completion both screens show the cumulative top-three Bobi podium and filterable potential answers, with host-only Next. Do not restore the homepage intro.

The question screen should fill the viewport with a mango-sago game scene, with a floating question and a countdown beside the bottom answer input. Start at the surface; deeper ingredients and tiers should be unknown until the dive reaches them. Practice should feel like a real question round, not a fitting room.

**Why:** The user rejected the small drink picture and later the exposed cross-section, supplied a full-screen Krillion gameplay reference, and explicitly said "We shouldnt KNOW the tiers already."

**How to apply:** Keep customization in joining/lobby, not practice. Reuse the full-screen player layout for practice, clearly distinguished from real server-scored play. Do not show tier ladders, ordered rewards or tier names in pre-round instructions. Only reveal the private reward after landing, unless the round has already ended; the full catalog opens at round completion.

Do not narrate "Bobi found a…" after the dive.

**Why:** The user explicitly said there was no need for "bobi found a pomelo gem."

**How to apply:** Use the earned reward and points display without a redundant discovery sentence.

Practice should start its 25-second countdown automatically after a brief prompt-reading delay, not when the player first types.

**Why:** The user explicitly corrected the previous type-to-start behavior: "when the prompt shows up, it should immediately start the countdown after a slight delay."

**How to apply:** Give practice a one-second reading pause followed by 25 seconds. Typing and rejected guesses never restart the clock. Keep the expired draft visible and offer explicit retry/next controls. Real multiplayer rounds retain their shared server deadline. The phone preview remains playable practice with game music.

Do not show a "Replay dive" action on the per-question reward.

**Why:** The user explicitly said there was no need for it.

**How to apply:** Play the earned dive once and leave its result visible. Keep practice's fresh-attempt and next-question controls separate from animation replay.

Forgive small answer typos only when there is one clear prepared-answer match.

Capitalization should never affect acceptance or require confirmation. The user asked for more forgiving autocorrect for longer phrases, including adding one missing word when a specific phrase has one clear match. They also want clear alternate forms like “patience” → “patient,” not loose partial or semantic matching. Exact answers always keep their own scores.

Use consistent capitalization for displayed prepared answers, including autocorrect suggestions. Keep player input case-insensitive; do not make capitalization a reason to request confirmation.

**Why:** The user chose "Forgive small answer typos" over typing suggestions, after being offered conservative matching that would not change an unusual answer into something else.

**How to apply:** Prefer exact answers; do not guess between plausible answers or favor higher rarity. For a unique misspelling, show original → corrected, put the canonical answer into the input, and require a second submit to confirm or allow editing. Do not lock, dive or award points on the suggestion alone. Keep the original deadline and calculate speed at confirmation. Display the confirmed corrected answer in the dive and results, without rewriting historical scores.

**Why confirmation matters:** The user supplied Krillion's “submit again to confirm · or edit” example and explicitly asked for the corrected spelling to be shown, not just silently credited.

For the restaurant question, “Waymo” and “Google” should suggest their cafe names. Single-word shortcuts should identify a prepared answer in the current question, not match arbitrary fragments. The user also gave “sovreign grace” → “Sovereign Grace Music” as an acceptable combination of a small typo and one missing word.

The user wants less important words filled in when a distinctive name is clear: “Vineyard” → “Vineyard Music,” “Zhangliang” → “Zhangliang Malatang,” and “Cali Spartan” → “Cali Spartan Tacos.” Treat “Malatang” as an explicit exception suggesting the requested Zhangliang restaurant, not the rarer Cuanyue entry.

Apply that same rule across the answer bank when there's a “VERY definitive tell.” The user wants “SGD Tofu House” as the displayed restaurant name, with “SGD Tofu” suggesting it. The former full name “So Gong Dong Tofu House” still counts, but do not map “So Gond Doo” to it. “Taichi” suggests the listed Taichi restaurant.

**Why:** Guests should be able to recognize a name without typing its full description. Generic words should not automatically be treated as a rare answer.

**How to apply:** Allow initials backed by a matching full word, or a distinctive full-word clue with only optional descriptors missing. The user considers “Kalbijjim” optional in “Daeho Kalbijjim.” Treat known singular/plural descriptors alike (“Seasons noodles” → “Seasons Noodle & Dumpling Garden”), not arbitrary changes to names. If multiple entries fit the clue, don't pick one. Keep the listed answer and its points.

For date activities, the user wants a distinctive word to work without the full action phrase: “Kardashians,” “volleyball,” and “Lego” should each suggest the corresponding listed activity.

For “Name an item Amy carries on her,” ordinary plurals such as “books” and “rings” should suggest “Book” and “Ring.” Keep “Jewelry” accepted as the same answer as “Ring.”

**Why:** The user asked for singular corrections on this question; plural forms should not be treated as new answers or promoted to a more specific ring tier.

“Minigolf/golfland” and “Walks/Charlie” mean either name is an exact answer, with the same tier and one results group. “Walking” also counts for “Walks/Charlie.” Don't assume other slashes in the workbook mean either answer unless the user confirms it. “Movies” should fill in “Watch movies.”
“Viet” should go straight to “Vietnamese” when listed, with no separate confirmation.

**Why:** Guests can identify the intended prepared answer without typing its full official name under the timer. The same text can already be an exact entry in a different round.

**How to apply:** Give exact entries priority; ask for confirmation on shortcuts. Only combine a typo with an omission when the input is long enough and at least two ordered words remain, one unchanged. Short category answers such as “beef noodles” shouldn't become a specific dish just because the bank contains only one close option.

The user wants general autocorrect only “a TAD bit more lenient.” Give long words and especially long phrases one additional spelling edit only for a clear match; do not loosen short answers, turn unrelated phrases into guesses, or score without confirmation.

**Why:** The goal is to help players type longer prepared answers under time pressure, not to change which answers are correct.

Reject answers outside the current question's prepared list rather than granting an example prize.

**Why:** The user said it should reject anything that is not correct or in the list, after reporting that the Pomelo rewards did not work. Practice must demonstrate real answer quality, not always award a manually selected tier.

**How to apply:** Use the same server-side prepared-answer matching for practice and multiplayer, retaining conservative typo forgiveness. Invalid attempts do not earn points, trigger a dive, record a submission or lock the draft. They do not restart the live deadline. Only the first accepted answer locks a player's round. Practice is unranked and does not save answers or points.

Treat an unlisted answer as normal game feedback, not an exception or HTTP error.

**Why:** The user explicitly corrected the 400 behavior: "it should just reject and not throw anything."

**How to apply:** Return a successful checked-but-not-accepted response. Show the bright coral retry notice directly above the typing bar, not at the top of the screen. Keep the input anchored and preserve the draft and deadline. Reserve HTTP errors for genuinely malformed requests, permission failures, expired rounds or unexpected service failures.

Display names must identify one seat per room, including the host; ignore capitalization and extra spaces when comparing them.

**Why:** The user asked for unique names after learning that duplicate names would be indistinguishable on the scoreboard.

**How to apply:** Check and insert under the same room lock, so simultaneous joins cannot take the same name. Keep the player’s displayed spelling and accents, and don't rename existing seats or change session recovery.

Keep the room code, name, and Join room button together near the top of phone join forms, before the optional Bobi fitting room. Put each code or name error directly below its own field, not below the wardrobe or in a raw HTTP message.

**Why:** The user said guests had to scroll through the outfit choices just to join or find out what to fix.

Prefer DAN, AMY, and RBF as an Easter egg, with a random three-letter fallback when all three are busy. Show guests only the assigned room code, never the list or the pattern.

**Why:** The user said the game is meant to be played once and wanted the short room codes to be a hidden personal touch.

**How to apply:** Keep room codes separate from host permissions. Before expiry, a saved session must still identify its original room even if the code was reused. After one hour without real activity, permanently remove the room, answers, scores, and saved sessions. Refreshing or polling must not reset the clock.

Scannable room invites must refer to the specific room instance, not just the reusable code. A guest with a saved seat can resume that same game, but a scan must never send them into a different game with the same code. The invite identifies a room; it does not grant a seat or host permissions.

Custom game creation is removed for now; new rooms use the original party game. Preserve already-created room data and compatibility rather than deleting it.

**Why:** The user asked to remove custom game functionality before putting the latest changes on GitHub main.

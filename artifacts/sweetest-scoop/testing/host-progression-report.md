# Host progression interruption verification

Verified on the development preview in a fresh room with one guest and two browser tabs sharing the same moderator seat. All seven rounds used the real 25-second server deadlines and expired naturally. No existing room or published app was used.

| Scenario | Observed result |
| --- | --- |
| Double-click Start; drop the accepted response | One Start POST reached the server and returned 200. The browser discarded the reply, read the room, and showed round 1 without sending another Start. The second tab also showed round 1. A separate Start replay left its deadline unchanged. |
| Both tabs click Next from round 1 results; drop one accepted response | Both requests named round 1 and returned 200. Both tabs showed round 2 without a skip or lingering error. |
| Replay round 1 Next after round 2 results open | The replay returned the existing round 2 results and original deadline. Neither tab advanced until the host clicked Next for round 2. |
| Block round 2 Next before it reaches the server | The host stayed on round 2 results and could retry after the room was checked. One intentional retry opened round 3. |
| Progress through rounds 3–7 | Both tabs showed every round in order. The server's start and end timestamps differed by exactly 25,000 ms in all seven rounds. |
| Drop the accepted Final standings response | Both tabs showed the final podium without another POST. Reloading the acting host tab preserved it; replaying round 7 Next returned the same finished state. |

To reproduce a lost response, wrap browser `fetch` for the selected host POST, forward it unchanged, record the successful HTTP status, then throw a network error before returning the response to the app. Blocking the request before sending tests a different case. For the delayed replay, wait until the following round is showing results before sending the original JSON body.

The API smoke suite also checks concurrent Start and Next, stale-round replays, invalid or premature Next requests, and guest permissions: `pnpm --filter @workspace/api-server exec tsx src/testing/party-smoke.ts`.

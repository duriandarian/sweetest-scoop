---
name: Party recovery testing
description: Scope and limits of browser network-interruption evidence for guests and hosts
---
Verify uncertain acceptance by forwarding an answer to the real server and discarding only its response, not by blocking the request before it reaches the server.

**Why:** A blocked request proves only that unsent answers earn nothing. The critical party risk is a committed answer whose acknowledgement never reaches the phone.

**How to apply:** Keep another guest unanswered while checking refresh and duplicate acceptance before the real 25-second deadline. Prepare the phone before starting the round, and use one scripted sequence for time-critical actions; individual browser-tool interactions can consume the entire round. Browser fetch interception is useful evidence but does not establish real-device sleep or physical-network behavior.

Bind host progression to the results the host saw, not just to whether the room is currently showing results.

**Why:** A late duplicate can arrive after the following round has already revealed, so testing only simultaneous clicks can miss a question skip.

**How to apply:** Use a fresh room with real timers. Verify separately that an accepted action with a lost reply recovers by reading state and that replaying the old Next after the following round reveals leaves that newer round and its deadline intact.

When using multiple tabs to represent separate devices, ensure both can poll as foreground pages.

**Why:** Disabling Chromium timer throttling alone doesn't make a background tab visible to the query client; a host tab can look stuck even while the server has revealed results.

**How to apply:** Use separate foreground browser instances, or explicitly emulate visible documents for a headless two-device check. Do not use that emulation when validating real background or screen-lock recovery.

Exercise a request that never settles as well as an immediate failed request. Test both a stalled, unsent submission and a successful server write with a stalled reply.

**Why:** The live party reported a guest stuck on “Checking…” until refresh. Offline mutation pausing and an unresolved network request each keep an ordinary pending flag true; a rejected-fetch test does not exercise them.

**How to apply:** The submission must stop waiting, preserve the draft if nothing locked, and recover any accepted answer from room state. Never resend automatically; the server timer and one-answer rule still apply.

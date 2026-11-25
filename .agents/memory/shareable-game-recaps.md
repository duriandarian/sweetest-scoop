---
name: Shareable game recaps
description: Privacy and expiry rules for personal game-result links
---
Treat a shared game result as a read-only capability for a finished guest's score and per-round outcomes; never make it a second player session or a saved game history.

**Why:** Guests should be able to show their scores without handing out access to the game or preserving results after the room expires.

**How to apply:** Bind the reference to the immutable room instance and the original seat, not the reusable room code. Verify a separate cryptographic signature; the seat's public ID by itself is not private. Keep the reference in the browser fragment and out of API URLs so it does not enter ordinary access logs. Neither viewing nor copying a recap should extend room activity. The copied text can remain readable on its own after expiry, but the link cannot recover expired results.

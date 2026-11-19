---
name: GitHub synchronization
description: Safely synchronizing separate Replit checkpoint and GitHub histories
---
The GitHub repository is `duriandarian/sweetest-scoop`, and it must remain private.

**Why:** The user explicitly requested that private repository for the completed source.

Preserve both the GitHub history and Replit's managed checkpoint history when synchronizing.

**Why:** The existing GitHub main branch and local checkpoint branch have separate ancestry. A normal push from the local branch would not fast-forward; overwriting either history is unnecessary.

**How to apply:** Fetch the latest remote head and inspect the source-tree differences. When ancestry is still separate, create a snapshot commit using the current clean source tree with the fetched GitHub head as its parent, then push that commit as a normal fast-forward. Do not reset, rebase or force-push the managed branch. Recheck if the remote has moved. Exclude credentials, database contents, dependencies and generated test recordings; retain the README's setup instructions and environment-variable names without values.

---
name: Standalone UI checks
description: Resolver behavior differs between Vite and standalone esbuild bundles used for server-rendered UI tests.
---
Standalone UI test bundles need exact-case module resolution; do not assume Vite's resolver behavior carries over.

**Why:** The standalone bundler conflated a UI component and its model when their basenames differed only by case and their extensions differed. Normal Vite rendering and TypeScript checks worked, but the standalone bundle selected the component in place of the model.

**How to apply:** Use exact filenames and extensions in standalone bundles, including inline or temporary entry-point imports, not only nested imports covered by a resolver hook. Do not broadly rename working app modules to accommodate the test bundler.

Bundle workspace TypeScript dependencies into standalone UI tests instead of treating them as external Node packages.

**Why:** Workspace source exports can contain extensionless TypeScript imports that Vite resolves but native Node does not. Adding a real API hook to a previously local-only component exposed this difference in server-rendered checks.

**How to apply:** Keep third-party dependencies external, but resolve workspace source packages into the test bundle. Do not change generated API imports or application module conventions to satisfy a standalone test runner.

If a leaf typecheck contradicts the generated API source after a merge, rebuild the workspace library declarations first.

**Why:** Updated hooks were present in source, but the existing declarations still represented the pre-merge request signature.

**How to apply:** Run the workspace library typecheck before checking the affected app. Verify the source and contract before editing either.

Separate actual typing behavior from the embedded Design canvas's interaction mode before changing answer-entry logic.

**Why:** The user continued reporting blocked practice typing after timer/input fixes. Real key-event checks in desktop and phone browsers preserved the full answer, focus and input node, with no errors. An enabled input in static markup alone had not established this. Replit's Canvas documentation says form inputs require the Interact tool.

**How to apply:** Reproduce draft entry in the live app rather than inferring a cause from the timer or a screenshot. If the live app works but the embedded canvas does not, check Interact versus selection mode or compare in a separate browser tab. Do not claim the user's exact cause is confirmed without observing it.

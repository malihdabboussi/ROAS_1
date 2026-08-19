# Changelog - August 19, 2026

## [2026-08-19 04:22] - [FIX]
What: Merged Client Context Bundle (#318) onto N0 ask-kind (#317) without dropping either path. `handleMessageEvent` still resolves the channel stamp and records `slack_pixel_turns`; it also loads the §11.11 bundle and `buildInboundSlackTurnPrompt` injects `[Client context]` after identity on client/unclear asks (skipped on general). Named-DM client ids stamp telemetry as `named`.
Why: Both PRs edited `slack-service-events.base.ts`. Taking only #318's prepend would overwrite the N0 prompt; taking only #317's stamp would drop the Yasir channel bundle.
Impact: Slack Pixel DMs that name a client get the channel list in the prompt and still write a turn row. Pre-existing slack-media / sender-resolver test failures unchanged.
Files: `slack-service-events.base.ts`, `slack-turn-prompt.ts`, `slack-turn-prompt.test.ts`

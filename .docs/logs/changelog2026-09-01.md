# Changelog - September 01, 2026

## [2026-09-01 09:00] - [FIX]

What: Routed explicit Slack post-call flow commands to the meeting follow-up action instead of the generic task-intake path.

Why: Pixel interpreted “Run post-call flow” as an unclear client request and asked whether to create a task.

Impact: Direct Pixel DMs can invoke the existing active post-call confirmation flow without entering canonical task lookup or Service Request intake.

Files: `apps/api/src/modules/slack/services/slack-ask-kind.ts`, `apps/api/src/modules/slack/services/__tests__/slack-ask-kind.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-09-01 09:41] - [FIX]

What: Excluded explicit post-call workflow commands from the agent's quoted-title canonical task-source shortcut.

Why: After Slack routed the request correctly, the auto chat pipeline still treated the quoted meeting title as a task provenance lookup.

Impact: The post-call command now reaches Pixel's meeting workflow instead of returning a `Task source` response.

Files: `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-09-01 11:32] - [FIX]

What: Preserved explicit artifact receipts when a completed write later fails delivery verification, and registered presentation source-file mutations as durable presentation outputs.

Why: A saved presentation draft and its successful repair writes were visible in Activity, but both paths could be discarded before chat output persistence, leaving Outputs empty.

Impact: Saved decks remain linked in chat and Outputs during repair-required states, completed presentation file edits reaffirm the same deck, and failed-before-effect actions still produce no false output.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.dispatch.test.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.test.ts`, `apps/agent-api/src/modules/shared/durable-artifact-output-registry.ts`, `apps/agent-api/src/modules/shared/ui-block-extractor.ts`, `apps/agent-api/src/modules/shared/ui-block-extractor.test.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-09-01 11:56] - [FIX]

What: Added the persisted presentation id and name to presentation file mutation results.

Why: Production browser verification showed that editing a deck preserved the correct linked artifact but replaced its exact Outputs label with the generic name `Presentation`.

Impact: Presentation writes, patches, and file deletions reaffirm the same addressable deck without degrading its human-readable Outputs label.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-presentation-bundle.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentations.service.test.ts`, `apps/agent-api/src/modules/shared/ui-block-extractor.test.ts`, `documentation/features/claude-chatgpt-shell.md`

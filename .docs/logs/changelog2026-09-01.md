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

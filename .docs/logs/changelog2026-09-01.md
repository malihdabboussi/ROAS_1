# Changelog - September 01, 2026

## [2026-09-01 09:00] - [FIX]

What: Routed explicit Slack post-call flow commands to the meeting follow-up action instead of the generic task-intake path.

Why: Pixel interpreted “Run post-call flow” as an unclear client request and asked whether to create a task.

Impact: Direct Pixel DMs can invoke the existing active post-call confirmation flow without entering canonical task lookup or Service Request intake.

Files: `apps/api/src/modules/slack/services/slack-ask-kind.ts`, `apps/api/src/modules/slack/services/__tests__/slack-ask-kind.test.ts`, `documentation/features/meeting-follow-up-slack.md`

# Changelog 2026-08-06

## [2026-08-06 15:10] - [FEATURE]

What: Added contextual `personal_moment` outreach to Team Intelligence so Pixel can notice high-confidence public Slack moments (birthday, anniversary, promotion, milestone, recognition, cultural moment) and send one bespoke Active DM after a short cooling window.
Why: Viktor-style teammate moments should reuse the observation/evidence/lifecycle architecture instead of a one-off birthday cron, and must stay off the numbered EOD digest path.
Impact: Internal Active recipients can receive one standalone personal-moment DM per event/day with stored source evidence for follow-ups; Shadow proposals stay reviewable; external people and private Brain details are excluded from Slack copy.
Files: `slack-team-personal-moment.ts`, `slack-team-loop-analysis.ts`, `slack-team-loop.service.ts`, `slack-team-signal-delivery.service.ts`, `slack-team-signal-message.ts`, `slack-team-loop-evidence.ts`, `slack-digest-reply-context.ts`, `spaces-automation.md`, focused personal-moment tests

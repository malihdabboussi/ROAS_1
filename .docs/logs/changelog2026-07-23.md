# Changelog - July 23, 2026

## [2026-07-23 11:10] - [FIX]

**What:** Corrected Pixel’s delegation routing so human teammates receive assigned tasks, managed AI agents receive agent delegation, and explicit PageGrader requests execute through the connected Page Grader MCP. Added verified-effect language, named-client precedence, and a persisted Page Grader operator skill. Added automatic missing-vector repair to Page Grader Campaign Brain imports and generalized the production backfill to discover every mapped Page Grader campaign Brain.

**Why:** Pixel treated humans and connected MCP services as interchangeable AI agents, inherited the wrong ambient campaign, and could describe delegation before a durable action existed. Separately, Page Grader wrote canonical Brain memories without embeddings while only its Campaign Knowledge copy was embedded, so imported clients could show memories but fail semantic Brain retrieval.

**Impact:** Rafay-style requests route to assigned human tasks, explicit PageGrader work uses MCP, Asura-style named clients override the current campaign, and successful delegation is reported only after tool confirmation. Existing and future Page Grader clients can receive complete Campaign Brain embeddings without duplicating memories.

**Production verification:** Rafay Anjum’s ROAS Slack person record is now manually classified Internal. No matching portal profile exists for `rafay@roas.co`, so identity linking remains intentionally unset instead of guessing. The bounded production repair discovered 26 mapped Page Grader client Brains and repaired 8,889 missing vectors; the independent final audit reports zero missing Page Grader memory embeddings across all 26.

**Files:** `packages/agent-policy/src/platform-tools-template.ts`, `docker/agents/{vibey,atlas}/skills/page-grader-operator/SKILL.md`, `supabase/migrations/20260723124500_page_grader_delegation_routing_skill.sql`, `apps/api/src/modules/brain/services/page-grader-*.service.ts`, `apps/api/src/modules/brain/brain.module.ts`, `scripts/roas/backfill-campaign-brain-embeddings.py`, and Page Grader feature documentation.

## [2026-07-23 12:05] - [FEATURE]

**What:** Added durable Slack-person classification editing, repaired active portal teammates plus James Anderson and Nefi Blanco as Internal, and protected manual classifications from later Slack refreshes. Added source-thread resolution checks, checkmark handling, structured Internal Shadow destinations, recipient diagnostics, independently scrolling Signals/Channels inbox panes, and named-client Brain precedence for Slack.

**Why:** Previously saved Internal/External choices could appear inferred again, signal review could not verify whether work had already been handled, long signal/channel lists scrolled the whole page, and Pixel could inherit an unrelated campaign Brain or fail a coached routing request with no actionable explanation.

**Impact:** An administrator explicitly saves a person type once and must enter Edit mode to change it. Signals can be rechecked against current Slack replies/reactions before planning. Pixel can draft an Internal DM, group DM, source-thread reply, broadcast, or channel message while keeping every result in Shadow until approval. Named clients such as Asura Group override ambient Slack campaign context.

**Files:** `apps/api/src/modules/slack/**`, `apps/web/src/features/team-2/**`, `docker/agents/vibey/skills/slack-signal-operator/SKILL.md`, `supabase/migrations/20260723143000_preserve_slack_people_classifications.sql`, `supabase/migrations/20260723143100_slack_signal_operator_routing_skill.sql`, and `documentation/features/meeting-follow-up-slack.md`.

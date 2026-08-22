# Pixel Ladder & Process Test Runbook (1–30)

This reference is the acceptance contract supplied for the ROAS Pixel validation handoff. Treat its status labels as prerequisites, not proof that a check currently passes.

## Environment and safety

- Production Supabase is only `lhfgtsjetcardinpgouq`. Database verification is read-only unless Dylan explicitly approves a write.
- Slack fixtures go only to the channel named `2` or a direct message with Pixel. Never spam client channels.
- Slack inbound route: `slack-service-events.base.ts` → `/api/channel-chat` SSE.
- Studio route: `chat.service.ts` → `chat-stable-turn-context.service.ts` → gateway.
- Statuses: `LIVE`, `PENDING`, `NOT BUILT`. Merged code can still be deployment-gated.
- All handoff PRs were merged when this runbook was supplied, including #343, #344, #352, #354, #356, and #357. Remaining gates are deployment-side, not code-side.
- Deployment gates named in the handoff: confirm current Vercel `apps/api` and `apps/web` production deploys; deploy `apps/agent-api` to Railway/Fly and resync the org agent; apply `20260819014500_pixel_vibey_browser_qc.sql`, `20260819020000_campaign_delegation_preview.sql` only with its Portal dependency, `20260820031500_meetings_client_workspace_columns.sql`, and earlier migrations from `scripts/roas/migration-order.txt`; run `node scripts/roas/cleanup-stamped-conversation-titles.mjs --apply` once; click **Team → People → Populate brains** once.

## A. Slack turn spine

1. **N0 ask-kind classifier — LIVE.** DM: “What was stats for Yasir's last webinar?”, “what's on my calendar tomorrow”, and “remind me to review the VSL Thursday”. Verify the newest `slack_pixel_turns.ask_kind` values are `client`, `personal/team`, and `reminder` respectively.
2. **Channel identity stamp — LIVE.** Compare a mapped client channel with channel `2`; mapped context resolves the client, channel `2` does not invent one.
3. **DM identity softening — LIVE.** DM a general haiku request. Verify no client lookup and `ask_kind=general`.
4. **Client Context Bundle — LIVE.** Ask for Yasir's Aug 6 webinar stats. Verify channel `#roas-yasir-khan-coaching-ltd-955`, the expected campaign, `client_source`, and client id `b17dcee8-2516-4318-aecc-1f7f449dfb92`.
5. **Client-scoped Slack search — LIVE.** Verify `integration_capabilities.parameters` contains `client_id` for `action_slug='SLACK_SEARCH_MESSAGES'` and `execution_mode='legacy'`, and that the turn's tool call carries client scoping.
6. **Archive-search coverage line — LIVE.** Ask about thin or inaccessible history. Verify the answer states the number of messages and oldest searched date.
7. **N1 quote inheritance — LIVE.** Forward a client-channel message into a Pixel DM. Verify source channel/client identity is inherited without clarification.
8. **Forwarded unfurl parse — LIVE.** Paste a Slack permalink in a DM. Verify Pixel reads the linked message and channel.
9. **Thread context wrapper — LIVE.** Send a short follow-up in a Pixel thread. Verify the client/topic is retained and the human ask remains the title.
10. **Per-turn telemetry — LIVE.** Verify one collapsed `slack_pixel_turns` row per tested turn with `ask_kind`, `client_source`, `forbidden_ask`, and the collapsed tool-call count.
11. **Forbidden-ask detector — LIVE.** A turn with enough client context must not ask which client/channel; verify `forbidden_ask=false` for good behavior.
12. **Title stamp guard — deploy/cleanup gated.** Run the named cleanup once after deploy, then verify zero conversation titles match `[Ask kind]%` or `[Slack channel identity]%`; a new Slack DM must keep the human ask as its title.
13. **Direct Service Request asset links — migration gated.** Requires `20260818233000_service_request_direct_assets.sql`. Forward one PDF example and one Drive-link example. Verify the created Service Request/ClickUp task has a direct working re-hosted or Drive URL, not only a Slack thread link.
14. **Multi-task one-confirm link — Portal gated.** Requires the Portal `slack-campaign-delegation` dependency and `20260819020000_campaign_delegation_preview.sql`. In channel `2`, request QC funnel + GHL + reset ads. Verify exactly one `https://portal.roas.io/?delegation=` link and no task-created claim before confirmation.

## B. Connections and Brain retrieval

15. **Slack → Connections bind — LIVE.** Start a Slack DM naming Yasir. Verify the mirrored conversation is bound to the matching campaign.
16. **Campaign Brain preload — LIVE.** In a bound client chat, ask a campaign strategy question. Verify real Brain facts without a false empty-Brain claim.
17. **Studio named-client bind — agent-api deploy gated.** In a new unbound chat ask “For Christian Osgood's multifamily strategy, what's the funnel plan?” and separately test “for Yasir”. Verify first-turn campaign binding. Negative fixture: “for Q4 planning” must not bind.
18. **Campaign Brain name resolution/fallback — agent-api deploy gated.** From Christian's bound campaign `af082417-8ae9-44d0-b5f5-4f8fd309f04a` (“Multifamily Strategy”), force a named Brain search. The referenced Brain begins `49856b8b-` and had 1,170 memories in the handoff, 369 containing his story. Verify results and no false empty-Brain claim; ambiguous “Andy” still clarifies.
19. **Personal Brain graph cap — LIVE.** Open Dylan's graph. Verify no 500, response below 4.5 MB, correct `node_window_capped`, and accurate UI completeness.
20. **Fathom → Campaign Brain dual-write — forward-only.** After a real client call, verify campaign-Brain memories whose `source_type` contains `fathom` increase. The approximately 1,046 historical meetings were user-Brain-only when handed off; historical backfill remains not built.
21. **Person-brain shadow routing — deploy and one-time populate gated.** Populate once, then ask Pixel “what do you know about Rafay?”. Verify Nefi, Rafay, Aaron, and Caleb person brains exist with more than zero Slack-derived memories and the response cites real facts.
22. **Company Brain feeds — NOT BUILT.** Record read-only `count(*)` and `max(created_at)` for the company-scoped Brain. The handoff baseline was 84 Drive-only memories and stale since July 20. Retest only after implementation ships.

## C. Skills, QC, and operations

23. **QC/Launch case ledger org resolution — LIVE.** Verify recent `agent_cases` rows with `source_type='page_grader_qc'` exist, grouped by `case_type`, over the last two days.
24. **Pixel skill kit — migration gated.** Requires `20260818234500_pixel_operator_skill_kit.sql`. Verify the system row (`user_id` and `org_id` null, `agent_key='vibey'`) has enabled `client-weekly-update`, then request a Yasir weekly update and check its structure.
25. **Browser parity + funnel QC — agent-api deploy/resync gated.** Ask Pixel to QC a live funnel. Require 1440 desktop and 390 mobile screenshots plus a click-through test lead, not an HTML fetch/checklist.
26. **Ask-kind miss report — merged.** Run `node scripts/roas/ask-kind-miss-report.mjs` read-only and capture weekly unclear-turn-with-resolved-client and misclassification candidates.
27. **Live 12-fixture harness — token and approval gated.** `node scripts/roas/pixel-slack-harness/run.mjs` is the safe dry run. `--live` requires `SLACK_HARNESS_USER_TOKEN`, posts only to channel `2`, and needs Dylan's action-time approval.

## D. App UI surfaces

28. **All Meetings client/campaign columns — deploy/migration gated.** Verify exact columns: `Name | Call Kind | Client Workspace | Campaign Space | Host | Call date | Call status | Recording`; saved views keep customizations.
29. **Doc viewer content — NOT BUILT.** Current repro from the handoff: open “Christian Osgood — … Modular UGC Ad Scripts” from conversation `41eef5c7-dd7e-444e-b843-40453a951b77`; database content exists but the right pane showed no content while DOCX rendered. After the fix, verify database-backed and storage-backed documents both render and a new “make me a doc” output opens on the first attempt.
30. **Retrieval receipts in Sources — NOT BUILT.** After implementation, verify every Brain search/preload shows Brain name, query, and result count, including zero-hit searches. Item 18 should show a receipt like `CAMPAIGN BRAIN — Multifamily Strategy · N memories` before any absence claim.

## Suggested order

1. Items 1–12.
2. Items 15–16, 19–20, and 23–25.
3. Deploy-gated items 17, 18, 21, 25, 28, and cleanup-gated item 12.
4. External or unavailable items 14, 22, 27, 29, and 30.

## Required report format

`#N PASS/FAIL/BLOCKED — evidence (reply link, mission receipt, deploy id, or read-only output) — notes`

For failures include the exact conversation id and timestamp so telemetry and logs can be correlated.

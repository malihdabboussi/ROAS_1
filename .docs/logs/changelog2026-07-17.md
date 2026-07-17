# Changelog - July 17, 2026

## [2026-07-17 12:54] - [FIX]

What: Fixed OpenClaw crash from missing `whatsapp` plugin in `docker/openclaw.json` (gateway was down → "Call (naming…)" + Gateway connection error: fetch failed). Added deterministic Meeting Purpose title fallback + gateway-error retries for task-agent. Redeployed Fly; renamed stuck personal weekly-wins call and re-invoked Vibey.
Why: Invalid plugins.entries.whatsapp made openclaw-gateway exit immediately (ECONNREFUSED :18789), so Fathom naming and Meeting Log agent work failed permanently.
Impact: Fly gateway healthy again. Hard-refresh Meetings — the stuck row should show a real title; agent retry is in progress for the meeting log.
Files: `docker/openclaw.json`, `fathom-meeting-title.ts`, `space-automation-service-06.base.ts`, `task-agent.service.ts`, tests

## [2026-07-17 12:51] - [STYLE]

What: Webinar Fulfillment subtasks use `Task 1–10 — …` titles (gates stay Gate 1–3); skill slugs removed from labels; UI maps legacy titles so the live mission list updates on refresh.
Why: Skill-slug titles were hard to scan; gates were numbered but work steps were not.
Impact: Hard-refresh `roas-web` for this mission’s list. Redeploy `mission-worker` so new missions persist Task N titles. Docs stay WEB#N.
Files: `webinar-fulfillment.helpers.ts`, `webinar-fulfillment.playbook.ts`, `webinar-fulfillment-titles.ts`, `MissionListCell.tsx`, `SubtasksSection.tsx`, `SubtaskDetailHeader.tsx`, `PlanDetailModal.tsx`

## [2026-07-17 12:49] - [FIX]

What: Finished subtask output no longer dumps raw JSON — shows the human/agent note text only (content or summary), labeled "Your note" / "Agent notes".
Why: Gate approve stores `{ summary, completed_by_human, deliverable_id, artifact_manifest }` without `content`, so the UI fell through to `JSON.stringify`.
Impact: Hard-refresh `roas-web`. Reopen an approved gate — you see the approval sentence, not JSON metadata.
Files: `subtask-detail.ts`, `SubtaskDetailContent.tsx`, `PlanDetailModal.tsx`, `messages.config.ts`

## [2026-07-17 12:48] - [FIX]

What: Mission doc preview has "Back to mission"; gate approve no longer creates empty docs; webinar flow docs use WEB#N titles (playbook + Space template + dual-write aliases); hide human approval receipts from deliverable lists.
Why: X-only preview felt like a dead end; Gate 1 approval was fake docs; Copy Package stayed a template stub when title mismatch blocked overwrite; flow order was unclear without numbering.
Impact: Hard-refresh `roas-web`. Redeploy `roas-api` (gate complete) + Fly `agent-api` (dual-write aliases) + `mission-worker` (WEB#N contracts). Existing Spaces keep old titles until agents re-save (aliases still match). New Spaces get WEB#1–#8 stubs.
Files: `DeliverablePreviewModal*.tsx`, `MissionDetailOverlayModals.tsx`, `MissionDetailModal.tsx`, `MissionDetailModalView.tsx`, `subtask-detail.ts`, `mission-human-subtask.service.ts`, `webinar-fulfillment.*.ts`, `space-template-catalog-agency-client-webinar.ts`, `artifact-document-mission-deliverables.service.ts`, `roas-webinar-copy-package/SKILL.md`

## [2026-07-17 12:41] - [STYLE]

What: Gate review sidebar is one panel — Action required embeds inside Review/Activity (no stacked “No activity yet”); upstream checklist renamed; duplicate “Your turn” chip removed.
Why: Right column showed completed upstream steps above an empty Activity empty-state, which looked contradictory.
Impact: Hard-refresh `roas-web`. Open Gate 2 — one Review column with approve/request changes + composer.
Files: `MissionDetailDesktopShell.tsx`, `ActivityTimeline.tsx`, `ActivityTimelineLogList.tsx`, `HumanGateReviewPanel.tsx`, `SubtaskDetailContent.tsx`

## [2026-07-17 12:39] - [FIX]

What: Ops Desk working/idle badges now filter the agent roster; briefing lists presence-working agents even without a mission; cards show "Working now" instead of "Nothing assigned" when status is working.
Why: Counts used agent.status while cards only showed mission focus, so "1 working" looked like everyone was idle.
Impact: Click working/idle on the Ops Desk to see who matches; click again to clear.
Files: `ops-desk-summary.ts`, `VibeyOpsDeskBriefing.tsx`, `VibeyOpsDesk.tsx`, `AgentsGrid.tsx`, `Team2ManageContent.tsx`, `messages.config.ts`


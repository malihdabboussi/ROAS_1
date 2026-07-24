# Meeting Follow-Up Slack Confirm

**Last Modified:** 2026-07-24

First production loop for the always-aware Slack agent: Fathom call lands in Meetings → Pixel drafts a human recap with the database-backed `post-call-delivery` skill (plus live `known_names` from campaigns / Page Grader / Slack People) → the exact recap and account-manager reminders are stored in Shadow Conversations. Flow-level `Shadow` performs the complete processing path without any Slack send. Flow-level `Active` uses those same stored drafts, sends account-manager reminders only to people classified Internal and individually set Active, and keeps the client-facing recap in the admin approval thread.

## Status (2026-07-22)

| Area                                                   | State                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| DM with purpose / takeaways / owners / Fathom link     | Working                                                                                                    |
| ✅ `white_check_mark` → stamp follow-ups in ROAS       | Working                                                                                                    |
| Shareable thread recap after ✅                        | Pixel-written, exact approved draft reused                                                                 |
| Database-backed `post-call-delivery` skill             | Implemented; runtime copy and production row synchronized                                                  |
| Shadow proposal in Team → People → Conversations       | Implemented                                                                                                |
| Flow-level Shadow / Active delivery                    | Implemented; Shadow processes without Slack sends, Active sends eligible internal reminders                |
| Slack org token resolution (personal call + org Slack) | Fixed                                                                                                      |
| Topics truncation mid-word                             | Fixed (brief skips Topics dump)                                                                            |
| Fathom markdown links → Slack mrkdwn                   | Fixed                                                                                                      |
| Markdown tables in Pixel replies                       | Fixed; Slack delivery converts them to compact labeled bullets                                             |
| Owner names as linked bullets                          | Fixed (headers + nested tasks)                                                                             |
| Friendly human recap voice                             | Implemented through the post-call skill                                                                    |
| Thread-reply revise loop                               | Implemented for pending post-call drafts                                                                   |
| Pixel channel directory + channel/thread timelines     | Implemented; app deployment required                                                                       |
| Person Brains in global Brain navigation               | Implemented; app deployment required                                                                       |
| Scheduled proactive Team loops                         | Installed in Shadow; live history polling is rate-limited and requires the shared observation stream below |
| Signal resolution refresh                              | Implemented; rechecks source-thread replies and explicit checkmark reactions before planning               |
| Internal / External / Ignored classification           | Manual classifications are durable; inferred records require an explicit first save                        |
| Signal action routing                                  | Internal DM, group DM, source thread, thread broadcast, and source channel remain Shadow until approval    |
| Named campaign Brain routing from Slack                | Explicit client/campaign names override ambient campaign context                                           |
| Pixel reply completion reactions                       | 👀 while processing; ✅ only after Slack accepts the completed reply                                       |
| Auto-post to a channel                                 | Not yet                                                                                                    |
| Page Grader dispatch on confirm                        | Fulfillment candidates only; conservative client/assignee resolution                                       |

## Intended product loop

```text
Fathom recording ready (my_recordings OR shared_team_recordings)
  → webhook resolves owner by webhook secret
  → optional transcript hydrate via Fathom API if payload omitted it
  → Meetings space item (call)  ← required; Slack loop never starts without this
  → agent_suggest_tasks (follow-ups with suggested owners)
  → Pixel + post-call-delivery skill drafts once
  → store the exact recap in the Shadow ledger
  → request_slack_follow_up_confirm
       Shadow: store recap + account-manager drafts in Conversations; send nothing
       Active: DM admin review + send eligible Internal/Active account-manager drafts
  → human reacts ✅
  → stamp follow-ups confirmed in ROAS
  → reply in Slack thread with the exact approved recap
  → (later) share to channel / attendees
  → confirmed fulfillment item → Page Grader + ClickUp → status back to Action Ledger
```

Team meetings (teammate-hosted Fathom recordings shared to your plan) use the same path. Pixel/Slack follow-up is downstream of the Meetings call row — if the webhook never creates that row, no Slack agent work runs.

## Agent strategy (Pixel / internal `vibey`)

Do **not** create a separate meeting-recap agent.

The Slack-facing bot is currently named **Pixel**. Its stable internal runtime key remains **`vibey`**. Naming is intentionally separate from capability design.

Pixel owns this as **one skill** among others:

- Read the call + relevant client/campaign brain
- Draft a friendly shareable recap (“Hey all — good connecting…”)
- Propose owned follow-ups
- Ask for ✅
- After confirm, post/share the recap

Specialize with skills/playbooks on Pixel later (client vs internal vs leadership). Do not spin up Customer Success / Manager / new specialists for this loop.

The skill is database-first in `agent_skills` and mirrored under `docker/agents/vibey/skills/post-call-delivery/` for runtime/bootstrap parity. The review DM contains the proposed recap. `custom_data.slack_follow_up_confirm` and `slack_shadow_actions` store the exact same draft; approval never regenerates it.

## Data flow

1. **Automation action** `request_slack_follow_up_confirm` runs after `agent_suggest_tasks` (Personal Dashboard Fathom Meeting Log template / live Meetings automation).
2. Service resolves suggestion IDs from the action or the latest `agent_suggest_tasks` step.
3. Calls Agent API `/api/agents/post-call-draft`, explicitly loading `post-call-delivery`, and receives `{ message, rationale, context_sources }`.
4. Writes that draft to `slack_shadow_actions` as a `workflow` proposal, linked to the admin's Slack person record when an email match exists.
5. Creates one Shadow `message` proposal per follow-up assignee matched to an **Internal** Slack person (grouped tasks, friendly reminder tone). Skips unmatched, External, Ignored, and `delivery_mode=off`. IDs are stored on `assignee_shadow_action_ids`.
6. In `delivery_mode=shadow`, stores the run payload and stops without opening a DM or sending any Slack message. In `delivery_mode=active`, opens the admin review DM, posts the proposed recap in its thread, then approves and sends only account-manager proposals whose person record is also Active.
7. Stores the Shadow or pending payload on the **call** item:

   `custom_data.slack_follow_up_confirm = { status, delivery_mode, channel_id, message_ts, space_item_ids, confirm_reaction, assignee_shadow_action_ids?, assignee_sent_action_ids?, ... }`

8. Slack Events API `reaction_added` → `SlackService.handleReactionAddedEvent` → `MeetingFollowUpSlackConfirmService.handleReactionAdded`.
9. On match (pending + correct reaction + channel/ts):
   - Call payload → `status: approved`
   - Each follow-up gets `custom_data.slack_follow_up_confirm_status: approved`
   - Thread reply uses `draft_message` byte-for-byte; the legacy template builder is used only for pending records created before this change
   - Matching Shadow action advances through approved → sending → sent
10. Slack send org is the call's organization when present; personal call items resolve the user’s active Slack `agent_channels` organization.

Before approval, a human reply in the review thread is treated as revision feedback. Pixel receives the current client-facing draft plus the feedback, creates a complete replacement draft, stores it as a new Shadow action that supersedes the prior proposal, and posts the updated draft in the thread. The original proposal is dismissed so an older version cannot inherit approval.

## Message shape

**Review DM (message 1)**

- Short `Call report` Fathom link at the top (no bottom “Open Fathom recording”)
- Title + purpose + key takeaways
- Timestamp jump links use a leading clock label (`31:12` …) then plain takeaway text
- Proposed action items with `_owner: Name_`
- Meetings link + ✅ CTA
- Does **not** embed the client-facing draft (keeps under Slack’s ~4k limit)

**Proposed shareable recap (message 2, threaded under review)**

- `Call report` link at the top when available
- Exact Pixel `draft_message` (trailing “Open the call recording” footers stripped)
- Link unfurls disabled so Fathom URLs stay compact

**Per-assignee Shadow reminders (People)**

- One `action_kind: message` proposal per person who owns ≥1 follow-up
- Friendly nudge listing only that person’s tasks with an inline `linked here` call link
- Closes with “Feel free to message me if you have questions.”
- Every proposal and delivered message is visible in Team → People → Conversations with a post-call label, call title, timestamp, status, and rationale
- Flow Shadow never sends; Flow Active sends automatically only when the recipient is Internal and their person delivery mode is Active
- External and Ignored people never receive proactive post-call messages
- The admin client recap still requires its own Slack review-thread approval
- On Approve & Send, Shadow is stamped `sent` with `metadata.slack_message_ts` + `metadata.slack_channel_id` so Conversations can track the DM
- Ops/`chat.postMessage` samples are **not** tracked unless they go through `sendShadowAction` (or mark the matching Shadow sent after post)
- If an ops sample is DMed to a different person than the ledger target (e.g. Aaron reminder content posted to Dylan’s Pixel DM), retarget `target_member_id` to the real recipient and keep `metadata.ops_manual` / `original_target_member_id` for audit — do not leave “Sent” under the wrong person

**Name knowledge at draft time**

- Before Pixel drafts the recap, the API loads canonical names from org campaigns, Page Grader clients / scope map, and Slack People
- Payload includes `known_names` so the skill prefers those spellings (no seeded alias map)
- Assignee reminder titles get a deterministic rewrite only when a catalog phrase already matches

**Thread replies**

- Pending **review** thread → revise client-facing draft (existing)
- Ops sample / no pending confirm → normal Pixel path: eyes reaction + agent reply
- Sent **assignee-reminder** thread → same Pixel path, with a bounded call brief (purpose + takeaways from the Meetings call item summary/description) plus that person's action items prepended from the Shadow ledger (`call_item_id` + `follow_up_ids`)
- Pixel keeps 👀 while the agent is working. After the response is accepted by Slack, Pixel adds ✅ and removes 👀. A provider-busy response waits five seconds and retries the selected model before using the configured fallback. If all attempts fail, Pixel removes 👀, explains that it is temporarily busy, and never marks the request complete.

**Confirm reply (after ✅)**

- Exact `draft_message` shown during review, posted in the review thread
- No regeneration after approval
- Meeting ✅ still does **not** auto-send assignee reminders

## Slack agent roadmap toward the Viktor-style experience

All phases use one agent (`vibey`, currently displayed as Pixel), multiple narrow skills, durable conversation records, and the same safety progression: observe → contextualize → draft → Shadow review → approve → act → learn.

### Phase 0 — Production stabilization and preload (current)

- Deploy the ROAS Page Grader first-ingest and bounded Campaign Knowledge indexing fixes, then force-sync every mapped active client and verify Brain memories, evidence, and semantic objects—not only campaign shells.
- Deploy Page Grader's background queue identity fix, drain the active-client backlog without opening Client Intel, and verify its hourly and weeknight schedules from run history.
- Replace four independent Slack history scans with one durable Slack Events observation stream. Joined-channel messages are captured once with team/channel/thread/timestamp evidence; every Shadow detector reads the same stored window.
- Keep the four proactive loops in Shadow. Do not enable Active delivery until observation runs succeed without Slack rate limits and proposals carry valid source evidence.
- Production finding on 2026-07-20: all four installed loops were enabled and scheduled, but all 21 recorded runs failed with Slack `ratelimited`; 23 of 26 Page Grader campaign scopes were still pending their first complete Brain sync.

### Phase 1 — Post-call delivery loop (current)

- Fathom/Meetings trigger, agent-written recap, owned follow-ups, Shadow ledger, ✅ approval, exact-draft delivery.
- Per-assignee Shadow message proposals (grouped action-item reminders) created with the review DM for People review.
- Team → People exposes both the person directory and Conversations; a person opens their combined real Slack + Shadow timeline.

### Phase 2 — Conversation command center (implemented foundation)

- Team → People now has People, Conversations, Signals, and Channels. Channels uses a Slack-style split: left rail of Pixel’s channels (public `#` / private lock), right pane for the selected channel’s conversation and threads (`peopleView=channels&slackChannel=`).
- Conversations contains only person-targeted Shadow actions. Team-level findings without a recipient stay in Signals and appear as a clear “team signals need routing” handoff instead of an “Unknown person” conversation. Person timelines merge the real Slack DM with the Shadow ledger, render Slack mrkdwn, open at the latest activity, and expose a jump-to-latest control when an administrator scrolls upward.
- Signals (`peopleView=signals`) is a peer tab for channel-level workflow/risk findings with no `target_member_id`. It uses the same selectable list + detail pattern as Conversations so review does not sit above the chat inbox. Expanded evidence shows the readable channel, speaker, source time, exact Slack excerpt, rationale, confidence, and an Open in Slack link.
- Signals and Channels now keep their left directory independently scrollable while the selected signal/channel remains in the middle pane, matching the Conversations inbox interaction.
- `Check if resolved` reloads the source Slack thread and reactions. A later human reply or an explicit checkmark reaction marks the finding resolved; resolved findings cannot create another action plan.
- Signal coaching resolves Internal recipients by full name, unique first name, Slack ID, username, or unique role. It reports unmatched recipients and unsupported destinations rather than silently dropping work.
- Coached actions support Internal DM, Internal group DM, source-thread reply, thread broadcast, and source-channel message. Every action is persisted as Shadow and still requires approval plus an Internal/Active recipient before Slack delivery.
- Product rule: Shadow `target_member_id` must match the real Slack delivery recipient. UI labels say “Sent to this person’s Slack” (or “Ops sample · sent to this Slack DM”) — never imply someone else received the DM.
- Person conversations and channel timelines show timestamps and distinguish Pixel messages from human messages.
- Group-DM conversations, richer thread grouping, and participants remain follow-up work.
- Join action items and unresolved commitments to the conversation that created them.
- Add review filters: proposed, approved, sent, failed, needs response, and waiting on human.

### Phase 3 — Reply and revision loop (post-call foundation implemented)

- Post-call review-thread replies now revise the active client-facing proposal and create a versioned replacement Shadow action.
- Assignee-reminder DM threads (after send) prepend that person’s action items so Pixel can answer questions with eyes + reply.
- Empty bot-token mapped channels fall back to org Slack routing so IM replies are not silently dropped.
- Extend the same revision contract beyond post-call recaps to other proactive proposals.
- Add richer approve/edit/dismiss controls in ROAS while preserving the rule that a changed draft cannot inherit an older approval.

### Phase 4 — Proactive team support in Shadow (implemented MVP)

- One five-minute Team Intelligence loop observes Person Brain facts, repeated manual work, unanswered questions, and stalled commitments/client risk from the shared Slack event ledger. Its incremental cursor prevents overlapping scans or repeat model spend, while hourly reconciliation fills missed events and thread replies.
- Every detected signal includes its source channel, Slack timestamp, explanation, confidence, and a deduplication fingerprint.
- Signals below 80% confidence or without exact ledger evidence are rejected. An external-subject finding creates a team-level Signal plus a linked Internal workspace-owner Shadow draft when that owner is mapped; Pixel never targets the external person.
- Shadow creates reviewable proposals only. Runs are visible in the existing Flow run history and the installed loop can be disabled as its kill switch.

### Phase 5 — Approved active loops (first bounded behavior implemented)

- Admins can activate one installed loop at a time and scope it to Slack channel IDs and/or managed-person record IDs. Empty scope means every visible Pixel channel and every person except Ignored.
- Controls include Shadow/Active, schedule, lookback window, daily limit, quiet hours, instructions, Flow run history, and enabled/disabled kill switch.
- Active Person Brain compounding writes durable, source-attributed memories. Active unanswered-question delivery is permitted only when both the loop and the target person are Active; the audit row advances through approved → sending → sent/failed.
- Workflow-discovery and client-risk findings remain proposals even when the loop is Active.
- Friendly channel/person pickers, escalation owners, and campaign-scoped routing remain follow-up work.
- Keep new or materially changed behavior in Shadow until separately approved.

### Phase 6 — Compounding intelligence (Person Brain foundation implemented)

- Managed Person Brains now appear below User Brains in the global Brain menu, with separate portal-account and external-person icons.
- Active Person Brain loops route explicit Slack facts into the person’s managed Brain and deduplicate by both source message and normalized content.
- Historical backfill now reuses the retryable Slack Brain import queue for enabled mapped channels. It creates missing managed Person Brains, forks knowledge by Slack sender, skips Ignored people, and intentionally excludes DM history.
- Broader routing to Customer, Company, Agent, and Campaign Brains still requires per-loop ownership and permission rules.
- Show what Pixel learned, why it was saved, which conversations/people/campaigns it connects, and allow correction or deletion.
- Measure accepted proposals, edits before approval, response rate, commitments completed, time saved, and false-positive rate so each loop improves from real team feedback.

### People classification contract

- `relationship_source=manual` is authoritative. Slack discovery and sender resolution must preserve the saved `Internal`, `External`, or `Ignored` value.
- Inferred people show the three relationship choices in a dropdown and require `Save`.
- After saving, the relationship is displayed as a stable badge. Changing it requires `Edit`, a new selection, and another explicit `Save`.
- Active portal teammates with matching organization/email are backfilled as `Internal/manual`. James Anderson and Nefi Blanco are repaired as Internal for the ROAS organization.
- A missing portal identity is not sufficient evidence that someone is External. Restricted/guest Slack status or a known customer-contact role may still infer External, but inferred values remain visibly unconfirmed until saved.

### Slack context and delegation contract

- Slack is organization-scoped. Ambient campaign context is a retrieval hint, never a lock.
- An explicit Slack channel mention or channel ID is authoritative. Channel history returns the canonical channel ID/name with its messages; Pixel must verify that identity before mapping the client and must never substitute a client inferred from message content.
- Slack replies use compact labeled bullets for row-based data. Markdown tables remain available on portal surfaces, but Pixel's Slack delivery formatter converts any pipe table that slips through before posting.
- If Dylan names `Asura Group` (or another client/campaign), Pixel must call `search_campaign_brain` with that explicit campaign name/id instead of continuing to query the prior campaign.
- Cross-campaign Brain reads resolve the named campaign without changing the Slack
  conversation's active campaign. This prevents one client lookup from leaking into
  later requests in the same thread.
- Human teammate work creates a durable human-assigned task. Managed AI-agent work uses agent delegation. Funnel, landing-page, campaign-page, and related fulfillment requests without a named human/agent infer Page Grader and use its connected MCP tool surface; the user does not need to name the integration.
- Page Grader writes resolve or confirm the client and campaign first. New campaigns and launches reuse known Brain, Space, and Page Grader context, then ask only for genuinely blocking missing details.
- Pixel may report delegation success only after the selected tool confirms a durable result.
- In funnel fulfillment, “the portal” means the ROAS portal fulfillment path. Pixel creates a native ROAS platform funnel only when explicitly asked to build it in the ROAS platform funnel builder; a failed portal request stops with a blocker instead of silently becoming a generic task or native funnel.
- Slack-facing failures use Pixel/product-neutral language; the retired Vibey product name is not shown to Slack users.

## File map (what we built / touched)

### Core API

| Path                                                                                             | Role                                                                        |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `apps/api/src/modules/spaces/services/meeting-follow-up-slack-confirm.service.ts`                | Request confirm, handle ✅, stamp ROAS, resolve Slack org, assignee Shadows |
| `apps/api/src/modules/spaces/services/meeting-follow-up-action-ledger.ts`                        | Classifies internal, clarification, and fulfillment action items            |
| `apps/api/src/modules/spaces/services/meeting-follow-up-page-grader-routing.ts`                  | Resolves each action item to an unambiguous client and assignee             |
| `apps/api/src/modules/spaces/services/meeting-follow-up-slack-message.ts`                        | Pure message builders (brief, links, owner headers, shareable recap)        |
| `apps/api/src/modules/spaces/services/meeting-follow-up-assignee-reminders.ts`                   | Group follow-ups by assignee + reminder DM text + Shadow creates            |
| `apps/api/src/modules/spaces/services/meeting-follow-up-name-knowledge.ts`                       | Match/rewrite helpers against campaign / PG / People catalogs               |
| `apps/api/src/modules/spaces/services/meeting-follow-up-name-knowledge.loader.ts`                | Loads name catalogs for post-call draft payload                             |
| `apps/agent-api/src/modules/task-agent/services/task-agent-suggestions.service.ts`               | Synchronous Pixel post-call draft using the required skill                  |
| `docker/agents/vibey/skills/post-call-delivery/SKILL.md`                                         | Runtime/bootstrap copy of the post-call skill                               |
| `supabase/migrations/20260720234500_vibey_post_call_delivery_skill.sql`                          | Database-backed system skill                                                |
| `supabase/migrations/20260722223500_sync_post_call_delivery_skill.sql`                           | Synchronizes the live system skill with the runtime copy                    |
| `apps/api/src/modules/slack/repositories/slack-people.repository.ts`                             | Persists/advances the Shadow proposal ledger                                |
| `apps/web/src/features/team-2/components/people/SlackPeopleView.tsx`                             | People / Conversations / Signals / Channels entry points                    |
| `apps/web/src/features/team-2/components/people/SlackPeopleViewsNav.tsx`                         | People views tab strip + Conversations/Signals to-review badges             |
| `apps/web/src/features/team-2/components/people/SlackTeamSignalsView.tsx`                        | Team signals selectable list + approve/dismiss detail pane                  |
| `apps/api/src/modules/spaces/services/__tests__/meeting-follow-up-slack-confirm.service.test.ts` | Unit tests                                                                  |
| `apps/api/src/modules/spaces/services/space-automation.service.ts`                               | Executes `request_slack_follow_up_confirm`                                  |
| `apps/api/src/modules/spaces/services/slack-team-loop.service.ts`                                | Observes Slack, analyzes signals, writes proposals/memories/sends           |
| `apps/api/src/modules/spaces/services/slack-team-loop-analysis.ts`                               | Bounded schema-constrained analyzer and token accounting                    |
| `apps/api/src/modules/slack/integrations/slack-api-integration-core.base.ts`                     | Paginates the complete Slack channel directory                              |
| `apps/api/src/modules/slack/services/slack-people.service.ts`                                    | Pixel channel and threaded activity APIs                                    |
| `apps/web/src/features/team-2/components/people/SlackChannelsView.tsx`                           | Left-rail channel directory + right-pane conversation timeline              |
| `apps/web/src/components/layout/sidebar/SidebarBrainFlyout.tsx`                                  | Global Person Brain navigation                                              |
| `apps/api/src/modules/spaces/dto/space-automation-action.dto.ts`                                 | Action schema                                                               |
| `apps/api/src/modules/spaces/dto/space-automation-draft-action.dto.ts`                           | Draft/loose schema                                                          |
| `apps/api/src/modules/spaces/spaces.module.ts`                                                   | Registers the confirm service                                               |

### Slack webhook path

| Path                                                               | Role                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `apps/api/src/modules/slack/services/slack.service.ts`             | Reactions + review revise + assignee-thread context prepend |
| `apps/api/src/modules/slack/services/slack-service-events.base.ts` | Message routing; empty-token fallback for DMs               |

### Template / catalog / capabilities

| Path                                                                                     | Role                                                                |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/api/src/modules/space-templates/data/space-template-catalog-personal-dashboard.ts` | Fathom Meeting Log includes confirm action                          |
| `apps/api/src/modules/space-templates/data/__tests__/space-template-catalog.test.ts`     | Expects action type                                                 |
| `packages/api-shared/src/types/flow-capabilities.ts`                                     | Capability surface                                                  |
| `apps/web/src/features/spaces/types/space-schema.ts`                                     | Frontend action type                                                |
| `apps/web/src/features/spaces/components/automations/automation-catalog.ts`              | Catalog entry                                                       |
| `apps/web/src/lib/flows/flow-builder-canvas.utils.ts`                                    | Flow canvas                                                         |
| `apps/web/src/lib/flows/automation-flow-step-summary.utils.ts`                           | Step summary                                                        |
| `apps/web/src/lib/flows/automation-publishable.ts`                                       | Publishability                                                      |
| `apps/api/src/modules/spaces/data/space-automation-template-catalog-team.ts`             | Unified Slack Team Intelligence template                            |
| `apps/api/src/modules/slack/services/slack-observation.service.ts`                       | Webhook capture, reconciliation, threads, cursors, backfill batches |
| `apps/api/src/modules/slack/repositories/slack-observation.repository.ts`                | Shared observation ledger persistence                               |
| `supabase/migrations/20260721100000_slack_observation_ledger.sql`                        | Ledger, channel/member index, and cursors                           |
| `supabase/migrations/20260721101000_unify_slack_team_observation_loop.sql`               | Consolidates four scanners into one Shadow loop                     |
| `supabase/migrations/20260722230500_accelerate_slack_team_intelligence.sql`              | Moves installed unified analyzers to a five-minute cursor cadence   |

### Docs / logs

| Path                                                | Role                                                    |
| --------------------------------------------------- | ------------------------------------------------------- |
| `documentation/features/spaces-automation.md`       | Short action note + decision log                        |
| `documentation/features/meeting-follow-up-slack.md` | This doc                                                |
| `.docs/logs/changelog2026-07-20.md`                 | Day changelog entries                                   |
| `.docs/plans/agent-follow-up-work.md`               | Deferred items (thread revise, ActionBuilder LOC, etc.) |

## Key IDs used in admin testing (prod)

| Thing                                      | Value                                                                |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Meetings space (org)                       | `71d2f284-78c5-4495-83d1-058dc285f094` (ROAS General; Fathom target) |
| Meetings space (old personal clone source) | `d957d348-c30a-4dbb-a089-ba3092332543` (automation disabled)         |
| Sample call                                | `9bf47aa7-b361-489e-b403-f213ba42e443` (“Nate and Dylan ops…”)       |
| Slack team                                 | `T03JLKLPXLY`                                                        |
| Dylan Slack user                           | `U03HG94MS8P`                                                        |
| DM channel                                 | `D0ACYFPD62V`                                                        |
| Default confirm email                      | `dylan@dylanvanas.com`                                               |
| Confirm reaction                           | `white_check_mark`                                                   |
| Events URL                                 | `https://api.roas.io/api/webhooks/slack/events`                      |

## Commits (feature line)

- `2a58d3b5` — feat: Slack DM follow-up confirm with summary and owners
- `7046aa68` — fix: ✅ reply + Slack org resolution; drop PG coupling
- `444fdcbf` — fix: shareable brief, Fathom Slack links, skip Topics dump
- `0b84ab6d` — fix: include Next Steps with timestamp links
- `99911625` — fix: nested bullets
- `c45cb0a3` — fix: owners as headers not hyperlinked bullets

## Decision log

- **2026-07-20:** Confirm is ROAS-owned. Internal handoffs remain in ROAS; only confirmed fulfillment candidates with unambiguous client and assignee mappings dispatch to Page Grader.
- **2026-07-20:** Client calls usually inherit their mapped Space client, but internal multi-client calls resolve the client independently from each action item before using Space/campaign mapping as a fallback.
- **2026-07-20:** Page Grader ClickUp status webhooks return completion, cancellation, and active status to the linked ROAS Action Ledger.
- **2026-07-20:** Slack brief uses Purpose + Key takeaways + Next Steps only — not full Topics (hits Slack length limits).
- **2026-07-20:** Fathom `[Name:](timestamp-url)` becomes plain `*Name's action items*` headers with task bullets under them (not hyperlinked names). Recording jump stays on the shared Fathom link.
- **2026-07-20:** Pixel is the current Slack display name; `vibey` remains the internal runtime key. Naming does not define the architecture.
- **2026-07-20:** One database-backed `post-call-delivery` skill owns meeting recap voice; no new specialist agent.
- **2026-07-20:** Approval applies to an immutable stored draft. The post-approval send does not ask the model to write again.
- **2026-07-20:** The first Slack message is an internal review brief. Thread replies revise the separate client-facing draft; ✅ on the original review message delivers the latest stored version.
- **2026-07-20:** Team support is consolidated in the existing Loops product through a Team filter; it is not a second automation system.
- **2026-07-20:** Off is the disabled Flow state. Shadow runs and proposes. Active may compound a Person Brain or answer an unanswered question only within admin scope, limits, quiet hours, and the person-level Active gate.
- **2026-07-20:** Slack source evidence is mandatory for every detected signal. Workflow-discovery and client-risk signals remain reviewable proposals in Active mode.
- **2026-07-20:** Per-assignee action-item reminders are Shadow `message` proposals created with the meeting review DM (not auto-sent on ✅). Matching uses Slack person email/display name; ignored and `delivery_mode=off` people are skipped.
- **2026-07-20:** Shadow ledger `target_member_id` must equal the Slack DM recipient. Ops samples delivered to Dylan cannot stay stamped on Aaron as Sent.
- **2026-07-20:** Person Brain history backfill is opt-in and bounded to enabled mapped channels; it never imports DMs. Managed Person Brains receive sender-filtered forks through the existing Brain queue, while portal users retain their canonical User Brain.
- **2026-07-22:** Completed calls continue into Slack review even when task suggestion returns no action items. The internal review and editable client-facing draft are still created; the draft explicitly says no action items were proposed.
- **2026-07-22:** Slack observation is webhook-first with hourly reconciliation, durable consumer recovery from the oldest unconsumed ledger event, and thread-aware unanswered-question suppression. Shadow continues during quiet hours because it cannot send; quiet hours block Active delivery only.
- **2026-07-22:** Slack Team Intelligence uses direct Gemini text generation so usage is covered by the configured Google spend cap and every run records input/output/total tokens plus provider cost. Active mode refuses to start without explicit channel and person allowlists.
- **2026-07-22:** Flow History distinguishes skipped/no-activity/analyzed/proposed outcomes. Manage People exposes channel-level workflow and risk signals with rationale and exact Slack evidence even when a proposal has no individual recipient.
- **2026-07-22:** Newly discovered Slack identities fail safe as External unless matched to a portal teammate or manually classified. Signal creation resolves Slack IDs to names and snapshots channel/person/time/source text so later review never depends on mutable Slack lookup state.
- **2026-07-22:** Recipient-less findings are Signals, never “Unknown person” conversations. External-subject Signals may create a linked Internal workspace-owner Shadow draft, but Pixel cannot target the external subject. The unified analyzer runs every five minutes from its exact cursor and rejects findings below 80% confidence.
- **2026-07-23:** Slack does not receive raw Markdown tables. Pixel is instructed to use labeled metric bullets in Slack, and the final Slack formatter deterministically converts any remaining pipe table before delivery.
- **2026-07-23:** Tagged Slack channels are authoritative client context. Pixel verifies the canonical channel identity before campaign/Brain lookup and fails closed rather than returning another client’s data.
- **2026-07-23:** “The portal” in funnel fulfillment means the ROAS portal workflow. A failed fulfillment call cannot silently fall back to a generic task, native funnel, substitute owner, or substitute client.
- **2026-07-24:** Provider rate limits receive one delayed retry on the selected model before model fallback. Exhausted retries return a specific Pixel-busy response instead of the generic processing error.

## Related

- Space automations overview: `documentation/features/spaces-automation.md`
- Deferred follow-ups: `.docs/plans/agent-follow-up-work.md`

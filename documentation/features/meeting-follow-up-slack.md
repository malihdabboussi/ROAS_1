# Meeting Follow-Up Slack Confirm

**Last Modified:** 2026-07-20

First production loop for the always-aware Slack agent: Fathom call lands in Meetings → Pixel drafts a human recap with the database-backed `post-call-delivery` skill → the exact draft is stored in Shadow → Slack DM asks for review → ✅ confirms in ROAS → that exact approved recap is posted in the thread. Page Grader send is **not** part of this path.

## Status (2026-07-20)

| Area                                                   | State                                      |
| ------------------------------------------------------ | ------------------------------------------ |
| DM with purpose / takeaways / owners / Fathom link     | Working                                    |
| ✅ `white_check_mark` → stamp follow-ups in ROAS       | Working                                    |
| Shareable thread recap after ✅                        | Pixel-written, exact approved draft reused |
| Database-backed `post-call-delivery` skill             | Implemented; migration required            |
| Shadow proposal in Team → People → Conversations       | Implemented                                |
| Slack org token resolution (personal call + org Slack) | Fixed                                      |
| Topics truncation mid-word                             | Fixed (brief skips Topics dump)            |
| Fathom markdown links → Slack mrkdwn                   | Fixed                                      |
| Owner names as linked bullets                          | Fixed (headers + nested tasks)             |
| Friendly human recap voice                             | Implemented through the post-call skill    |
| Thread-reply revise loop                               | Implemented for pending post-call drafts   |
| Auto-post to a channel                                 | Not yet                                    |
| Page Grader dispatch on confirm                        | Explicitly removed / deferred              |

## Intended product loop

```text
Fathom recording ready
  → Meetings space item (call)
  → agent_suggest_tasks (follow-ups with suggested owners)
  → Pixel + post-call-delivery skill drafts once
  → store the exact recap in the Shadow ledger
  → request_slack_follow_up_confirm
       DM admin (default dylan@dylanvanas.com)
  → human reacts ✅
  → stamp follow-ups confirmed in ROAS
  → reply in Slack thread with the exact approved recap
  → (later) share to channel / attendees
  → (later) optional Page Grader send
```

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
5. Opens Slack DM via the bot token and posts a review message containing the proposed recap.
6. Stores pending payload on the **call** item:

   `custom_data.slack_follow_up_confirm = { status, channel_id, message_ts, space_item_ids, confirm_reaction, ... }`

7. Slack Events API `reaction_added` → `SlackService.handleReactionAddedEvent` → `MeetingFollowUpSlackConfirmService.handleReactionAdded`.
8. On match (pending + correct reaction + channel/ts):
   - Call payload → `status: approved`
   - Each follow-up gets `custom_data.slack_follow_up_confirm_status: approved`
   - Thread reply uses `draft_message` byte-for-byte; the legacy template builder is used only for pending records created before this change
   - Matching Shadow action advances through approved → sending → sent
9. Slack send org is the call's organization when present; personal call items resolve the user’s active Slack `agent_channels` organization.

Before approval, a human reply in the review thread is treated as revision feedback. Pixel receives the current client-facing draft plus the feedback, creates a complete replacement draft, stores it as a new Shadow action that supersedes the prior proposal, and posts the updated draft in the thread. The original proposal is dismissed so an older version cannot inherit approval.

## Message shape

**Review DM**

- Title + purpose + key takeaways
- Optional “From the call” (Next Steps): owner names as bold Fathom jump-links, tasks as bullets
- Proposed action items with `_owner: Name_`
- Fathom recording link + Meetings link
- CTA: react ✅ for shareable recap

**Confirm reply (shareable)**

- Exact `draft_message` shown during review
- Human opening, concise decisions/takeaways, owned action items, and recording link as applicable
- No regeneration after approval

## Slack agent roadmap toward the Viktor-style experience

All phases use one agent (`vibey`, currently displayed as Pixel), multiple narrow skills, durable conversation records, and the same safety progression: observe → contextualize → draft → Shadow review → approve → act → learn.

### Phase 1 — Post-call delivery loop (current)

- Fathom/Meetings trigger, agent-written recap, owned follow-ups, Shadow ledger, ✅ approval, exact-draft delivery.
- Team → People exposes both the person directory and Conversations; a person opens their combined real Slack + Shadow timeline.

### Phase 2 — Conversation command center

- Add channel and group-DM conversations beside person DMs, with thread grouping, participants, source channel, timestamps, delivery state, and “why Pixel drafted this” evidence.
- Join action items and unresolved commitments to the conversation that created them.
- Add review filters: proposed, approved, sent, failed, needs response, and waiting on human.

### Phase 3 — Reply and revision loop (post-call foundation implemented)

- Post-call review-thread replies now revise the active client-facing proposal and create a versioned replacement Shadow action.
- Extend the same revision contract beyond post-call recaps to other proactive proposals.
- Add richer approve/edit/dismiss controls in ROAS while preserving the rule that a changed draft cannot inherit an older approval.

### Phase 4 — Proactive team support in Shadow

- Observe unanswered questions, stalled commitments, new teammates, repeated manual work, and client risk signals.
- Create proposals only; no autonomous outbound sends.
- Surface workflow-discovery suggestions with evidence, expected impact, and a per-loop activation control.

### Phase 5 — Approved active loops

- Let admins activate one proven loop at a time for selected internal people, external people, channels, or campaigns.
- Add frequency limits, quiet hours, escalation owners, stop conditions, audit history, and a kill switch.
- Keep new or materially changed behavior in Shadow until separately approved.

### Phase 6 — Compounding intelligence

- Route durable learning to the correct User, Person, Customer, Company, Agent, or Campaign Brain with source attribution and permissions.
- Show what Pixel learned, why it was saved, which conversations/people/campaigns it connects, and allow correction or deletion.
- Measure accepted proposals, edits before approval, response rate, commitments completed, time saved, and false-positive rate so each loop improves from real team feedback.

## File map (what we built / touched)

### Core API

| Path                                                                                             | Role                                                                 |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `apps/api/src/modules/spaces/services/meeting-follow-up-slack-confirm.service.ts`                | Request confirm, handle ✅, stamp ROAS, resolve Slack org            |
| `apps/api/src/modules/spaces/services/meeting-follow-up-slack-message.ts`                        | Pure message builders (brief, links, owner headers, shareable recap) |
| `apps/agent-api/src/modules/task-agent/services/task-agent-suggestions.service.ts`               | Synchronous Pixel post-call draft using the required skill           |
| `docker/agents/vibey/skills/post-call-delivery/SKILL.md`                                         | Runtime/bootstrap copy of the post-call skill                        |
| `supabase/migrations/20260720234500_vibey_post_call_delivery_skill.sql`                          | Database-backed system skill                                         |
| `apps/api/src/modules/slack/repositories/slack-people.repository.ts`                             | Persists/advances the Shadow proposal ledger                         |
| `apps/web/src/features/team-2/components/people/SlackPeopleView.tsx`                             | People / Conversations entry points                                  |
| `apps/api/src/modules/spaces/services/__tests__/meeting-follow-up-slack-confirm.service.test.ts` | Unit tests                                                           |
| `apps/api/src/modules/spaces/services/space-automation.service.ts`                               | Executes `request_slack_follow_up_confirm`                           |
| `apps/api/src/modules/spaces/dto/space-automation-action.dto.ts`                                 | Action schema                                                        |
| `apps/api/src/modules/spaces/dto/space-automation-draft-action.dto.ts`                           | Draft/loose schema                                                   |
| `apps/api/src/modules/spaces/spaces.module.ts`                                                   | Registers the confirm service                                        |

### Slack webhook path

| Path                                                               | Role                                         |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `apps/api/src/modules/slack/services/slack.service.ts`             | `handleReactionAddedEvent` → confirm service |
| `apps/api/src/modules/slack/services/slack-service-events.base.ts` | Routes `reaction_added`                      |

### Template / catalog / capabilities

| Path                                                                                     | Role                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| `apps/api/src/modules/space-templates/data/space-template-catalog-personal-dashboard.ts` | Fathom Meeting Log includes confirm action |
| `apps/api/src/modules/space-templates/data/__tests__/space-template-catalog.test.ts`     | Expects action type                        |
| `packages/api-shared/src/types/flow-capabilities.ts`                                     | Capability surface                         |
| `apps/web/src/features/spaces/types/space-schema.ts`                                     | Frontend action type                       |
| `apps/web/src/features/spaces/components/automations/automation-catalog.ts`              | Catalog entry                              |
| `apps/web/src/lib/flows/flow-builder-canvas.utils.ts`                                    | Flow canvas                                |
| `apps/web/src/lib/flows/automation-flow-step-summary.utils.ts`                           | Step summary                               |
| `apps/web/src/lib/flows/automation-publishable.ts`                                       | Publishability                             |

### Docs / logs

| Path                                                | Role                                                    |
| --------------------------------------------------- | ------------------------------------------------------- |
| `documentation/features/spaces-automation.md`       | Short action note + decision log                        |
| `documentation/features/meeting-follow-up-slack.md` | This doc                                                |
| `.docs/logs/changelog2026-07-20.md`                 | Day changelog entries                                   |
| `.docs/plans/agent-follow-up-work.md`               | Deferred items (thread revise, ActionBuilder LOC, etc.) |

## Key IDs used in admin testing (prod)

| Thing                 | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| Meetings space        | `d957d348-c30a-4dbb-a089-ba3092332543`                         |
| Sample call           | `9bf47aa7-b361-489e-b403-f213ba42e443` (“Nate and Dylan ops…”) |
| Slack team            | `T03JLKLPXLY`                                                  |
| Dylan Slack user      | `U03HG94MS8P`                                                  |
| DM channel            | `D0ACYFPD62V`                                                  |
| Default confirm email | `dylan@dylanvanas.com`                                         |
| Confirm reaction      | `white_check_mark`                                             |
| Events URL            | `https://api.roas.io/api/webhooks/slack/events`                |

## Commits (feature line)

- `2a58d3b5` — feat: Slack DM follow-up confirm with summary and owners
- `7046aa68` — fix: ✅ reply + Slack org resolution; drop PG coupling
- `444fdcbf` — fix: shareable brief, Fathom Slack links, skip Topics dump
- `0b84ab6d` — fix: include Next Steps with timestamp links
- `99911625` — fix: nested bullets
- `c45cb0a3` — fix: owners as headers not hyperlinked bullets

## Decision log

- **2026-07-20:** Confirm is ROAS-owned; Page Grader dispatch removed from this path.
- **2026-07-20:** Slack brief uses Purpose + Key takeaways + Next Steps only — not full Topics (hits Slack length limits).
- **2026-07-20:** Fathom `[Name:](timestamp-url)` becomes plain `*Name's action items*` headers with task bullets under them (not hyperlinked names). Recording jump stays on the shared Fathom link.
- **2026-07-20:** Pixel is the current Slack display name; `vibey` remains the internal runtime key. Naming does not define the architecture.
- **2026-07-20:** One database-backed `post-call-delivery` skill owns meeting recap voice; no new specialist agent.
- **2026-07-20:** Approval applies to an immutable stored draft. The post-approval send does not ask the model to write again.
- **2026-07-20:** The first Slack message is an internal review brief. Thread replies revise the separate client-facing draft; ✅ on the original review message delivers the latest stored version.

## Related

- Space automations overview: `documentation/features/spaces-automation.md`
- Deferred follow-ups: `.docs/plans/agent-follow-up-work.md`

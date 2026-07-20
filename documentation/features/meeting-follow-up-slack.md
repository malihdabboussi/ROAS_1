# Meeting Follow-Up Slack Confirm

**Last Modified:** 2026-07-20

Admin MVP for the post-call ops loop: Fathom call lands in Meetings → automation suggests follow-ups → Slack DM for review → ✅ confirms in ROAS → shareable recap in the thread. Page Grader send is **not** part of this path yet.

## Status (2026-07-20)

| Area                                                   | State                                             |
| ------------------------------------------------------ | ------------------------------------------------- |
| DM with purpose / takeaways / owners / Fathom link     | Working                                           |
| ✅ `white_check_mark` → stamp follow-ups in ROAS       | Working                                           |
| Shareable thread recap after ✅                        | Working (template-based, not SlotBot-written yet) |
| Slack org token resolution (personal call + org Slack) | Fixed                                             |
| Topics truncation mid-word                             | Fixed (brief skips Topics dump)                   |
| Fathom markdown links → Slack mrkdwn                   | Fixed                                             |
| Owner names as linked bullets                          | Fixed (headers + nested tasks)                    |
| Friendly “Hey all…” voice                              | Not yet (next: SlotBot skill)                     |
| Thread-reply revise loop                               | Not yet                                           |
| Auto-post to a channel                                 | Not yet                                           |
| Page Grader dispatch on confirm                        | Explicitly removed / deferred                     |

## Intended product loop

```text
Fathom recording ready
  → Meetings space item (call)
  → agent_suggest_tasks (follow-ups with suggested owners)
  → request_slack_follow_up_confirm
       DM admin (default dylan@dylanvanas.com)
  → human reacts ✅
  → stamp follow-ups confirmed in ROAS
  → reply in Slack thread with shareable recap
  → (later) SlotBot writes the human voice
  → (later) share to channel / attendees
  → (later) optional Page Grader send
```

## Agent strategy (SlotBot)

Do **not** create a separate meeting-recap agent.

**SlotBot** (always-aware Slack agent) owns this as **one skill** among others:

- Read the call + relevant client/campaign brain
- Draft a friendly shareable recap (“Hey all — good connecting…”)
- Propose owned follow-ups
- Ask for ✅
- After confirm, post/share the recap

Specialize with skills/playbooks on SlotBot later (client vs internal vs leadership). Do not spin up Customer Success / Manager / new specialists for this MVP.

**Near-term agent work (when prioritized):**

1. Add a SlotBot skill for post-call Delivery PM voice + structure
2. Wire the confirm reply (and optionally the review DM) through that skill
3. Keep channel plumbing on the existing Slack/`vibey` mapping; SlotBot is the persona/brain on that surface

## Data flow

1. **Automation action** `request_slack_follow_up_confirm` runs after `agent_suggest_tasks` (Personal Dashboard Fathom Meeting Log template / live Meetings automation).
2. Service resolves suggestion IDs from the action or the latest `agent_suggest_tasks` step.
3. Opens Slack DM via bot token for the admin email.
4. Posts review message built by `buildConfirmMessage` (purpose, key takeaways, from-the-call owners, proposed action items).
5. Stores pending payload on the **call** item:

   `custom_data.slack_follow_up_confirm = { status, channel_id, message_ts, space_item_ids, confirm_reaction, ... }`

6. Slack Events API `reaction_added` → `SlackService.handleReactionAddedEvent` → `MeetingFollowUpSlackConfirmService.handleReactionAdded`.
7. On match (pending + correct reaction + channel/ts):
   - Call payload → `status: approved`
   - Each follow-up gets `custom_data.slack_follow_up_confirm_status: approved`
   - Thread reply via `buildShareableConfirmReply`
8. Slack send org is resolved from the user’s active `agent_channels` row (call items can have `org_id: null` while Slack is org-scoped).

## Message shape

**Review DM**

- Title + purpose + key takeaways
- Optional “From the call” (Next Steps): owner names as bold Fathom jump-links, tasks as bullets
- Proposed action items with `_owner: Name_`
- Fathom recording link + Meetings link
- CTA: react ✅ for shareable recap

**Confirm reply (shareable)**

- `Meeting recap: …`
- Same brief sections
- Confirmed action items with owners
- Recording link
- Footer: copy/forward ready; confirmed in ROAS; not sent to Page Grader

## File map (what we built / touched)

### Core API

| Path                                                                                             | Role                                                                 |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `apps/api/src/modules/spaces/services/meeting-follow-up-slack-confirm.service.ts`                | Request confirm, handle ✅, stamp ROAS, resolve Slack org            |
| `apps/api/src/modules/spaces/services/meeting-follow-up-slack-message.ts`                        | Pure message builders (brief, links, owner headers, shareable recap) |
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
- **2026-07-20:** One SlotBot skill owns meeting recap voice later; no new specialist agent for one Slack slot.

## Related

- Space automations overview: `documentation/features/spaces-automation.md`
- Deferred follow-ups: `.docs/plans/agent-follow-up-work.md`

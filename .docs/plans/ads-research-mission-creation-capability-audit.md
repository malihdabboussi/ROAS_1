# Ads Research Mission Creation Capability Drift Audit

Generated: 2026-07-20

## Purpose

Verify that Blaze can lead Ads Research intake from a Space while respecting Vibey ownership of mission creation.

## Result Summary

- Known drift rows: 0 after this repair.
- Direct product gaps: none for the current intake flow.
- Critical conclusion: `create_mission` is executable and documented, but intentionally restricted to Vibey. Blaze must use `delegate_to_agent` and remain the visible conversational owner.

## Drift Rows

| Action or field | Current drift | Impact | Priority |
| --- | --- | --- | --- |
| `create_mission` recovery | Resolved | Managed agents now receive an exact Vibey delegation correction instead of a dead end. | Complete |
| Ads Research playbook payload | Resolved | Intake now places `playbook_id` inside `input` and preserves the structured kickoff, Space, and campaign. | Complete |
| Seeded chat agent | Resolved | A fresh Ads Research seed creates and sends through the requested `ads_manager` conversation instead of the stale active agent. | Complete |
| Campaign-scoped Vibey delegation | Resolved | Vibey remains reachable as the system mission owner without being redundantly assigned as a campaign worker. | Complete |

## Direct Capability Gaps

None. The existing delegation runtime allows Blaze to assign the restricted mission-creation action to Vibey without giving Blaze broader mission-management permissions.

## Recommended Fix Order

1. Keep mission creation restricted to Vibey.
2. Keep Ads Research intake and user-facing follow-up under Blaze.
3. Deploy the web and Agent API changes together so the seeded routing and recovery contract stay aligned.

## Acceptance Criteria

- Run Research opens a fresh `ads_manager` conversation.
- Blaze asks all three intake questions before creating work.
- Blaze delegates to `vibey` with the exact Space, campaign, `input.playbook_id`, and `input.playbook_kickoff`.
- Campaign-scoped delegation to Vibey does not stop at a campaign-assignment prompt.
- The conversation confirms and links the mission only after successful delegation.
- Managed-agent RBAC tests preserve Vibey-only mission creation and assert the delegation correction.

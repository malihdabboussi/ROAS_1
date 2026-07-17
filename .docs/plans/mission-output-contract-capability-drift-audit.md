# Mission Output Contract Capability Drift Audit

Generated: 2026-07-17

## Purpose

Verify that every action required by a Mission playbook output contract is recognized by mission preflight and resolves to the same action domain used by the executable agent policy.

## Result Summary

- Known drift rows before remediation: `create_ad`, `create_funnel` missing from mission preflight.
- Direct product gaps: none; both actions already have schemas, handlers, policy mappings, and agent-facing documentation.
- Critical conclusion: mission preflight duplicated a partial action-to-domain map instead of consuming the canonical policy registry.

## Drift Rows

| Action | Current drift | Impact | Priority |
| --- | --- | --- | --- |
| `create_ad` | Fixed: mission preflight now consumes the canonical registry. | Static Ads can pass preflight and reach Blaze. | Blocker |
| `create_funnel` | Fixed: mission preflight now consumes the canonical registry. | Funnel Design will not hit the same false unknown-action block. | Blocker |

## Direct Capability Gaps

None found for the Webinar Fulfillment output-contract actions.

## Recommended Fix Order

1. Replace the mission-only action map with `@vibey/agent-policy`'s canonical registry.
2. Guard every Webinar Fulfillment output contract with a focused drift test.
3. Deploy mission-worker, then retry the blocked Static Ads subtask.

## Acceptance Criteria

- Every Webinar Fulfillment `required_action` resolves to an action domain.
- The focused playbook and drift tests pass.
- Mission-worker typecheck passes.
- Production mission-worker is deployed from the fix commit.
- The blocked Static Ads subtask is retried and advances beyond preflight.

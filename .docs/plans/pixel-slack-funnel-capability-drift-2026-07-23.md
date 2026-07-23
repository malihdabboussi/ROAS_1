# Pixel Slack and Funnel Capability Drift Audit

Generated: 2026-07-23

## Purpose

Verify the capabilities Pixel needed for the Whole Universe and Asura Group Slack requests across executable tools, policy, runtime skills, and production-backed rows.

## Result Summary

- Known drift rows: 1
- Direct product gaps: 1
- Critical conclusion: Slack channel history previously omitted canonical channel identity, allowing client inference from message content. Funnel publishing exists in the ROAS API but is not exposed as a Pixel action.

## Drift Rows

| Action or field | Current drift | Impact | Priority |
| --- | --- | --- | --- |
| `SLACK_GET_CHANNEL_HISTORY.channel` | Fixed in API response, capability description, Pixel policy, and production migration | Pixel can anchor a tagged channel to its real name before client/Brain resolution | P0 |
| `publish_funnel` | Backend API exists; agent schema, registry, policy, MCP catalog, generated docs, and runtime handler are missing | Pixel cannot publish a native funnel or return its confirmed live URL | P1 |

## Direct Capability Gaps

- Pixel has no first-class `publish_funnel` action. Adding it requires the full action contract, lifecycle/preflight classification, workflow circuit/error contract, runtime handler, policy/MCP exposure, generated docs, and regression coverage.
- The Google Docs request needs a separate production trace. The supplied transcript ends before completion, so it does not prove whether the document job was still running, failed, or completed without a Slack reply.

## Recommended Fix Order

1. Deploy the canonical Slack channel identity response and production policy migration.
2. Add `publish_funnel` through every required agent action surface and route it to the existing ROAS API publish service.
3. Trace the document request by Slack event/conversation ID and add bounded progress/failure handling only after the exact stalled step is known.

## Acceptance Criteria

- A request containing `<#channel-id>` returns that channel’s canonical name and never reports another client’s Brain or Meta data.
- A failed ROAS portal fulfillment request creates no generic task or native funnel.
- An explicit native-funnel publish request invokes `publish_funnel`, returns the confirmed public URL, and does not claim a custom domain is required when the default ROAS domain is available.
- Long-running document jobs end in a confirmed link or one actionable failure within a bounded time.

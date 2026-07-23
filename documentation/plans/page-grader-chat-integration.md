# ROAS chat inside Page Grader

## Recommendation

Build a thin native ROAS chat client inside Page Grader after the MCP bridge is
stable. Page Grader should not create a second brain or a separate conversation
history. The page becomes another authenticated view of ROAS chat.

## Preferred flow

1. A signed-in Page Grader user opens the `ROAS Agent` tab.
2. Page Grader requests a short-lived, single-use handoff token from ROAS.
3. ROAS verifies the Page Grader user and organization mapping, then creates or
   refreshes a ROAS session.
4. Page Grader loads the native chat shell against ROAS conversation APIs.
5. The current Page Grader client and campaign are sent as explicit UI context,
   not permanently injected as unsourced memory.
6. Vibey uses ROAS Brain and the Page Grader MCP server exactly as it does from
   Slack.

This preserves one brain, one tool policy, one audit trail, and one conversation
system while allowing the experience to feel native inside Page Grader.

## Why not an iframe first

An iframe is acceptable for a private prototype but creates avoidable session,
navigation, responsive-layout, and browser-cookie problems. It also makes
client/campaign context handoff less explicit. The short-lived SSO handoff plus
native chat shell is the cleaner production path.

## Milestones

1. Define user, organization, client, and campaign identity mappings.
2. Add signed one-time handoff token endpoints to both systems.
3. Add a read-only Page Grader `ROAS Agent` tab with streaming chat.
4. Pass active client/campaign context and show it visibly above the composer.
5. Add ROAS tool approvals and action receipts to the chat.
6. Add deep links between a chat answer and Page Grader campaign/task records.
7. Pilot internally before exposing the tab to clients.

## Guardrails

- Never expose ROAS company-wide brain context to a client account.
- Scope every chat session to organization, user role, and mapped client.
- Keep write approvals and MCP audit records consistent with Slack.
- Do not silently turn viewed Page Grader data into permanent memory.
- Preserve one conversation id when moving between ROAS, Slack threads, and
  Page Grader wherever identity and access allow it.

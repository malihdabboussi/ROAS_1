# ROAS Missions Claude plugin

This plugin connects Claude to the hosted ROAS MCP server and adds workflows for launching and supervising missions and for executing the Pixel Ladder 1–30 test runbook.

## Install in Claude Cowork

For a private GitHub-synced organization marketplace, add `dylanvanas1/roas-platform` under **Organization settings → Plugins → Add plugins → GitHub**. Enable the `roas-missions` plugin, then authenticate the `roas-platform` connector when Claude asks.

For a manual test, zip the contents of `plugins/roas-missions` so `.claude-plugin/plugin.json` is at the archive root, then upload the ZIP to a manual marketplace.

## Use

- “Run a ROAS mission to audit the Impact campaign’s active funnels.”
- “Check mission `<id>` and show me the evidence and deliverables.”
- “Run the Pixel Ladder test runbook. Start with the items that are safe and live.”
- `/roas-missions:run-mission <brief>`
- `/roas-missions:pixel-ladder <optional item numbers>`

Claude resolves campaign and Space scope before mission creation, uses an idempotency key, and does not report completion until mission state and durable deliverables support it.

## Local validation

```bash
claude plugin validate ./plugins/roas-missions
claude plugin validate .
claude --plugin-dir ./plugins/roas-missions
```

In Claude Code, run `/mcp` to complete OAuth if the connector is waiting for authentication.

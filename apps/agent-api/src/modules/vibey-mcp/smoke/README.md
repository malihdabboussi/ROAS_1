# Hosted ROAS MCP Smoke Matrix

Run these after local OAuth and MCP endpoints are up.

## Targets

- Cursor MCP client
- Claude Desktop or Claude web MCP connector, when available
- MCP Inspector against `https://mcp.roas.io` or the legacy `/api/mcp` path.

## Required Checks

- Unauthenticated connection discovers OAuth protected resource metadata.
- Authorization opens `/mcp/consent`.
- PKCE token exchange succeeds.
- `tools/list` returns only the v1 ROAS MCP catalog.
- `describe_vibey_action` succeeds.
- `search_user_brain` succeeds for a known query.
- Revoked token rejects.
- Forbidden scope returns `403` or an MCP tool error for insufficient scope.

## Automated Tool Smoke

Run the hosted MCP tool matrix against a local or deployed agent API endpoint:

```bash
MCP_SMOKE_TOKEN=<oauth-access-token> \
MCP_SMOKE_URL=http://localhost:3003 \
pnpm --filter @vibey/agent-api exec tsx src/modules/vibey-mcp/smoke/vibey-mcp-smoke-runner.ts
```

Optional environment values:

- `MCP_SMOKE_AGENT_BRAIN_ID`: enables `search_agent_brain`.
- `MCP_SMOKE_SPACE_ID` and `MCP_SMOKE_SPACE_DOCUMENT_ID`: enable `read_space_document`.
- `VIBEY_DOCS_BASE_URL`: docs app origin used by `search_vibey_docs` (defaults to `http://localhost:3011`).

The runner writes a JSON report to `src/modules/vibey-mcp/smoke/logs/` with one row per tool.

The runner also asserts Supabase-style MCP guidance:

- `initialize` returns non-empty server instructions that mention `describe_vibey_action`.
- `tools/list` returns `search_vibey_docs` with `inputSchema.required` containing `query`.
- `search_vibey_docs` returns at least one citation for `campaign dashboard`.

## Result Template

```md
Client:
Version:
Redirect URI:
Auth discovery:
Tool count:
First successful tool:
Revocation result:
Blockers:
```

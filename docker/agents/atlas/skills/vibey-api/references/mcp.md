# MCP

## add_mcp_server
**Required keys:** `name`, `url`

**Optional keys:** `server_url`, `description`, `domain`

**Aliases:** `server_url` → `url`

**Types:** `name`: string, `url`: string, `server_url`: string, `description`: string, `domain`: string

**Use when:** Connect a new public MCP server for the workspace when the user provides a server URL.

**Do not use when:** Using tools from an already connected MCP server; list_mcp_servers/list_mcp_tools/use_mcp_tool instead. Private MCP servers that require API keys, bearer tokens, headers, or secrets. Ask the user to connect those through the secure Vibey integration flow.

Connects a new public MCP server to the workspace. Required: name and url. Optional: description and domain. Do not ask users for API keys, bearer tokens, headers, or secrets in chat. If a private MCP server needs authentication, tell the user to connect it through the secure Vibey integration flow. Domain controls which agent domains can use the server: universal/shared for all, or marketing/analyst/developer/operations. This action is restricted to high-trust agents.

```json
{"action":"add_mcp_server","label":"Connecting MCP server","data":{"name":"docs","url":"https://example.com/mcp","domain":"developer"}}
```

Contract example: connect public docs MCP
```json
{"action":"add_mcp_server","label":"connect public docs MCP","data":{"name":"docs","url":"https://example.com/mcp","description":"Documentation tools","domain":"developer"}}
```

## list_mcp_resources
**Required keys:** `server_id,server_name`

**Optional keys:** `server_id`, `server_name`

**Types:** `server_id`: string, `server_name`: string

**Use when:** List MCP resources exposed by a connected server before reading one by URI.

Lists resources exposed by one connected MCP server. Required: either server_name or server_id. Use this before read_mcp_resource so you can copy the exact resource URI. The server must be enabled and accessible for your agent domain.

```json
{"action":"list_mcp_resources","label":"Checking MCP resources","data":{"server_name":"docs"}}
```

Contract example: list resources from a connected MCP server
```json
{"action":"list_mcp_resources","label":"list resources from a connected MCP server","data":{"server_name":"docs"}}
```

## list_mcp_servers
**Use when:** Discover which MCP servers are already connected to the current workspace.

Lists MCP servers connected to this workspace. Use first when the user asks what MCP tools are available or before calling an MCP tool. Returns id, name, server_url, domain, enabled flags, tool_count, and last_connected_at. No input is required.

```json
{"action":"list_mcp_servers","label":"Checking connected MCP servers","data":{}}
```

Contract example: list connected MCP servers
```json
{"action":"list_mcp_servers","label":"list connected MCP servers","data":{}}
```

## list_mcp_tools
**Required keys:** `server_id,server_name`

**Optional keys:** `server_id`, `server_name`

**Types:** `server_id`: string, `server_name`: string

**Use when:** Inspect the tools exposed by one connected MCP server before calling a tool.

Lists live tools exposed by one connected MCP server. Required: either server_name or server_id. Use this before use_mcp_tool so you can copy the exact tool_name and input schema. The server must be enabled and accessible for your agent domain.

```json
{"action":"list_mcp_tools","label":"Checking Zuops tools","data":{"server_name":"zuops"}}
```

```json
{"action":"list_mcp_tools","label":"Checking MCP tools","data":{"server_id":"UUID"}}
```

Contract example: list tools on the Zuops MCP server
```json
{"action":"list_mcp_tools","label":"list tools on the Zuops MCP server","data":{"server_name":"zuops"}}
```

## read_mcp_resource
**Required keys:** `server_id,server_name`, `uri`

**Optional keys:** `server_id`, `server_name`

**Types:** `server_id`: string, `server_name`: string, `uri`: string

**Use when:** Read a specific MCP resource by URI after list_mcp_resources returns it.

Reads one MCP resource by URI from a connected MCP server. Required: either server_name or server_id, plus uri. Use list_mcp_resources first to get the exact uri. The server must be enabled, agent_enabled, and accessible for your agent domain.

```json
{"action":"read_mcp_resource","label":"Reading MCP resource","data":{"server_name":"docs","uri":"resource://example"}}
```

Contract example: read a resource from a connected MCP server
```json
{"action":"read_mcp_resource","label":"read a resource from a connected MCP server","data":{"server_name":"docs","uri":"resource://example"}}
```

## remove_mcp_server
**Required keys:** `server_id`

**Types:** `server_id`: string

**Use when:** Remove a connected MCP server by id after the user explicitly asks to disconnect it.

Removes a connected MCP server by server_id. This deletes the server config and stored MCP secret. Use list_mcp_servers first to get the id, and only call this when the user explicitly asks to disconnect/remove the server.

```json
{"action":"remove_mcp_server","label":"Removing MCP server","data":{"server_id":"UUID"}}
```

Contract example: remove an MCP server
```json
{"action":"remove_mcp_server","label":"remove an MCP server","data":{"server_id":"UUID"}}
```

## use_mcp_tool
**Required keys:** `server_id,server_name`, `tool_name`

**Optional keys:** `server_id`, `server_name`, `tool`, `arguments`, `args`

**Aliases:** `tool` → `tool_name`, `args` → `arguments`

**Types:** `server_id`: string, `server_name`: string, `tool_name`: string, `tool`: string

**Use when:** Call a tool on a connected MCP server after list_mcp_tools confirms the tool name and input schema.

**Do not use when:** Adding a new MCP server; use add_mcp_server instead.

Calls a tool on a connected MCP server. Required: either server_name or server_id, plus tool_name. Put the MCP tool payload inside arguments. Run list_mcp_tools first and follow that tool inputSchema exactly. Aliases accepted: tool -> tool_name, args -> arguments. The server must be enabled, agent_enabled, and accessible for your agent domain.

```json
{"action":"use_mcp_tool","label":"Checking Zuops credits","data":{"server_name":"zuops","tool_name":"check_credits","arguments":{}}}
```

```json
{"action":"use_mcp_tool","label":"Generating image with Zuops","data":{"server_name":"zuops","tool_name":"generate_image","arguments":{"prompt":"Premium product photo on white background","aspect_ratio":"1:1","resolution":"2K"}}}
```

Contract example: check credits on Zuops
```json
{"action":"use_mcp_tool","label":"check credits on Zuops","data":{"server_name":"zuops","tool_name":"check_credits","arguments":{}}}
```

Contract example: call a Zuops generation tool with inputs
```json
{"action":"use_mcp_tool","label":"call a Zuops generation tool with inputs","data":{"server_name":"zuops","tool_name":"generate_image","arguments":{"prompt":"Premium product photo on white background"}}}
```

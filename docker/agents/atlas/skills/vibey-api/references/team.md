# Team

## ask_agent
**Required keys:** `target_agent_key`, `prompt`

Asks another agent a question on behalf of the user. The target agent responds with a single answer. Use when the user wants to consult a specialist (e.g. "ask the copywriter to review this headline"). If the target agent is not on the team, the backend returns hire suggestions. Required fields: `target_agent_key` (the agent_key of the agent to ask, e.g. "copywriter"), `prompt` (the question or request text).

```json
{"action":"ask_agent","label":"Consulting with Ivy","data":{"target_agent_key":"copywriter","prompt":"Review this headline and suggest improvements: 'Transform Your Business Today'"}}
```

## brainstorm_agents
**Required keys:** `brief`

**Optional keys:** `brief`, `campaign_id`

**Types:** `brief`: string, `campaign_id`: string

Starts a multi-agent brainstorm session. Multiple agents discuss a topic in rounds, building on each other's ideas. Each agent sees all prior contributions and adds new angles. Required fields: `agents` (array of agent_keys in turn order, minimum 2), `topic` (the brainstorm concept/question), `rounds` (number of discussion rounds, default 2, max 5).

```json
{"action":"brainstorm_agents","label":"Brainstorming Q3 positioning","data":{"agents":["niko","ivy","lux"],"topic":"Q3 product positioning strategy for enterprise segment","rounds":3}}
```

## copy_skill_resource
**Required keys:** `source_skill_id`, `source_resource_id`, `target_skill_id`

**Optional keys:** `source_skill_id`, `source_resource_id`, `target_skill_id`, `agent_key`

**Types:** `source_skill_id`: string, `source_resource_id`: string, `target_skill_id`: string, `agent_key`: string

Copies a reference file from one agent skill to another. Reads the source resource and writes it to the target skill. Use for sharing templates or reference material between agents.

```json
{"action":"copy_skill_resource","label":"Copying skill reference","data":{"source_agent_key":"vibey","source_skill_key":"funnel-builder","file_path":"references/tsx-template.md","target_agent_key":"ivy","target_skill_key":"landing-page-copy"}}
```

## create_agent_skill
**Required keys:** `agent_key`, `skill_key`, `name`, `description`, `markdown_content`

**Types:** `agent_key`: string, `skill_key`: string, `name`: string, `description`: string, `markdown_content`: string

**Use when:** Create a new skill for an existing agent after list_agent_skills confirms the skill does not already exist.

**Do not use when:** Updating an existing skill; this MCP surface intentionally does not expose skill editing. Creating a new agent; this MCP surface intentionally does not expose agent creation.

Creates a custom skill for an agent. User sees: skill in the agent's skill list in Team. When: user wants to teach an agent a new capability or workflow. agent_key is optional for the current agent and resolved from session when omitted.

```json
{"action":"create_agent_skill","label":"Adding agent skill","data":{"agent_key":"copywriter","skill_key":"my_skill","name":"Title","description":"...","markdown_content":"..."}}
```

Contract example: create a skill for an existing agent
```json
{"action":"create_agent_skill","label":"create a skill for an existing agent","data":{"agent_key":"copywriter","skill_key":"offer_copy_reference","name":"Offer Copy Reference","description":"Writes offer copy using the attached reference material.","markdown_content":"# Offer Copy Reference\n\nUse the attached references before writing."}}
```

## create_agent_skill_resource
**Required keys:** `agent_key`, `skill_key`, `file_path`, `content`

**Types:** `agent_key`: string, `skill_key`: string, `file_path`: string, `content`: string

**Use when:** Attach text, markdown, or reference documentation to an existing skill. Use upload_agent_skill_image_reference instead when the reference is an image URL.

Adds or replaces a reference file for an agent skill. agent_key is optional for the current agent and resolved from session when omitted. Reference files are supporting material (design systems, templates, code samples) stored separately from the skill body.

```json
{"action":"create_agent_skill_resource","label":"Adding skill reference file","data":{"agent_key":"copywriter","skill_key":"my_skill","file_path":"references/design-system.md","content":"# Reference content"}}
```

Contract example: attach a markdown reference to a skill
```json
{"action":"create_agent_skill_resource","label":"attach a markdown reference to a skill","data":{"agent_key":"copywriter","skill_key":"offer_copy_reference","file_path":"references/offer-notes.md","content":"# Offer Notes\n\nUse concise proof before claims."}}
```

## delegate_to_agent
**Required keys:** `target_agent_key`, `task_description`

Delegates a task to another agent. The target agent uses its tools to complete the work and returns deliverables. Use when the user wants another agent to produce something (e.g. "have the designer create a logo"). If the target agent is not on the team, the backend returns hire suggestions. Required fields: `target_agent_key` (the agent_key of the agent to delegate to, e.g. "developer"), `task_description` (what the agent should do).

```json
{"action":"delegate_to_agent","label":"Delegating to Rex","data":{"target_agent_key":"developer","task_description":"Build a responsive landing page for the Q2 product launch"}}
```

## delete_agent_skill
**Required keys:** `agent_key`, `skill_id`

**Optional keys:** `agent_key`, `skill_id`

**Types:** `agent_key`: string, `skill_id`: string

Deletes an agent skill by skill_id. agent_key is optional for the current agent and resolved from session when omitted.

```json
{"action":"delete_agent_skill","label":"Removing agent skill","data":{"agent_key":"copywriter","skill_id":"UUID"}}
```

## delete_agent_skill_resource
**Required keys:** `agent_key`, `skill_id`, `resource_id`

**Optional keys:** `agent_key`, `skill_id`, `resource_id`

**Types:** `agent_key`: string, `skill_id`: string, `resource_id`: string

Requests deletion of a reference file from an agent skill. agent_key is optional for the current agent and resolved from session when omitted. Returns a confirmation card the user must approve.

```json
{"action":"delete_agent_skill_resource","label":"Removing skill reference","data":{"agent_key":"copywriter","skill_key":"my_skill","file_path":"references/design-system.md"}}
```

## get_agent
**Required keys:** `agent_key`

Gets detailed information about a specific team agent — role, personality (DISC profile), specialty, communication style, values, and skills. Cannot inspect system agents (vibey, hr, atlas, brain_scholar, viktor). Returns a structured summary, not raw files. Use before update_agent to understand the current identity. Use after create_agent to verify the hire exists and matches the intended name, role, purpose, and communication style before telling the user the agent is ready.

```json
{"action":"get_agent","label":"Looking up agent details","data":{"agent_key":"copywriter"}}
```

## list_agent_skills
**Required keys:** `agent_key`

**Types:** `agent_key`: string

**Use when:** List existing skills for one agent before creating a new skill, so duplicate skill_key values are avoided.

Lists skills for an agent. agent_key is optional when managing the current agent because the backend resolves it from the session; pass agent_key only when explicitly targeting another agent.

```json
{"action":"list_agent_skills","label":"Reviewing agent skills","data":{"agent_key":"copywriter"}}
```

## list_team
**Use when:** List available Vibey agents before choosing an agent_key for skill work.

Lists agents on the user workspace with role, level, specialty, and domain.

```json
{"action":"list_team","label":"Reviewing your team","data":{}}
```

## update_agent_skill
**Required keys:** `skill_id`

**Optional keys:** `agent_key`, `skill_key`, `name`, `description`, `markdown_content`, `is_enabled`, `change_summary`

**Types:** `agent_key`: string, `skill_id`: string, `change_summary`: string

Updates an existing agent skill. agent_key is optional for the current agent and resolved from session when omitted. Accepts: skill_key, name, description, markdown_content, is_enabled. Required for user-facing history: include change_summary (past-tense, behavior-focused, max 120 chars; never mention file names). For reference files, use create_agent_skill_resource instead.

```json
{"action":"update_agent_skill","label":"Updating agent skill","data":{"agent_key":"copywriter","skill_id":"UUID","name":"New Title","description":"Updated description","markdown_content":"Updated body","is_enabled":true,"change_summary":"Sharpened their copy-review process"}}
```

## update_agent_skill_resource
**Required keys:** `agent_key`, `skill_id`, `resource_id`

**Optional keys:** `agent_key`, `skill_id`, `resource_id`, `content`, `metadata`

**Types:** `agent_key`: string, `skill_id`: string, `resource_id`: string, `content`: string, `metadata`: object

Updates the content of an existing reference file for an agent skill. agent_key is optional for the current agent and resolved from session when omitted. Same as create_agent_skill_resource (upserts by file_path).

```json
{"action":"update_agent_skill_resource","label":"Updating skill reference","data":{"agent_key":"copywriter","skill_key":"my_skill","file_path":"references/design-system.md","content":"# Updated content"}}
```

## upload_skill_asset
**Required keys:** `agent_key`, `skill_key`, `image_url,asset_ref`

**Optional keys:** `asset_ref`, `description`

**Types:** `agent_key`: string, `skill_key`: string, `image_url`: string, `asset_ref`: object, `description`: string

**Use when:** Attach an image reference to an existing agent skill from a URL. The backend downloads the image, stores it in skill-assets, creates a skill resource, and returns the public URL/resource.

Uploads an image or file to an agent skill as a reference asset. Downloads from the provided image_url or normalized asset_ref, stores in Supabase storage, and attaches to the skill as a visual reference. When: user wants to add a reference image, brand asset, mockup, or visual example to a skill.

```json
{"action":"upload_skill_asset","label":"Adding image to skill","data":{"agent_key":"copywriter","skill_key":"seo-writing","asset_ref":{"kind":"external_asset","url":"https://example.com/brand-palette.png"},"image_url":"https://example.com/brand-palette.png","description":"Brand color palette reference"}}
```

Contract example: attach an image reference to a skill
```json
{"action":"upload_skill_asset","label":"attach an image reference to a skill","data":{"agent_key":"designer","skill_key":"brand_visual_reference","image_url":"https://example.com/reference.png","description":"homepage-visual-reference.png"}}
```

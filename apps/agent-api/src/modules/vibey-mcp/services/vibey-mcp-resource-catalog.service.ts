import { Injectable } from '@nestjs/common'

export interface VibeyMcpResourceDefinition {
  uri: string
  name: string
  description: string
  mimeType: 'text/markdown'
  text: string
}

function markdownResource(
  uri: string,
  name: string,
  description: string,
  text: string,
): VibeyMcpResourceDefinition {
  return { uri, name, description, mimeType: 'text/markdown', text }
}

const RESOURCES = [
  markdownResource(
    'vibey://mcp/workflows/overview',
    'Vibey MCP Overview',
    'General guidance for choosing Vibey MCP tools safely.',
    [
      '# Vibey MCP Overview',
      '',
      'Vibey MCP is organized around read/list-first workflows. Use exact IDs from list or search tools before opening or writing records.',
      '',
      'Core guidance:',
      '- Use `describe_vibey_action` before writes or unfamiliar tools.',
      '- Use `search_vibey_docs` before guessing Vibey product behavior.',
      '- Use `prompts/list` for workflow templates.',
      '- Use `resources/list` for longer playbooks.',
      '- Do not pass `user_id` or `org_id`; OAuth tokens define the current identity.',
      '',
      'Recommended routing:',
      '- Campaign and Space work starts with campaigns, Spaces, views, documents, or tasks.',
      '- Brain work starts with `search_brains` or a family-specific Brain search.',
      '- Skill creation starts with `list_agents` and `list_agent_skills`.',
    ].join('\n'),
  ),
  markdownResource(
    'vibey://mcp/workflows/spaces',
    'Spaces Workflow',
    'How to navigate Spaces, views, items, documents, and tasks.',
    [
      '# Spaces Workflow',
      '',
      'Use Spaces tools when the user asks what exists inside a campaign or Space.',
      '',
      'Main path:',
      '1. `list_campaigns`',
      '2. `list_spaces` with `campaign_id` when known',
      '3. `get_space` and `list_space_views` with `space_id` to learn schema fields, status ids, view ids, and custom filters',
      '4. `list_space_view_items` with `space_id`, `view_id`, filters/search, `fields: "summary"`, bounded `limit`, and `include_count` when counts are needed',
      '5. `get_space_item` with `space_id` and `item_id` only after the filtered list returns the needed id',
      '',
      'Documents:',
      '1. `list_spaces` with `campaign_id` when known',
      '2. `list_documents` with Space or campaign context, plus `search` or `parent_item_id` before increasing `limit`',
      '3. `read_space_document` with `space_id` and `document_id` only for selected documents',
      '',
      'Tasks:',
      '1. `list_spaces` with `campaign_id` when known',
      '2. `get_space` to map user-created status/category/custom field ids',
      '3. `list_tasks` with status/category/filters/search, `fields: "summary"`, bounded `limit`, and `include_count` when counts are needed',
      '4. For "my tasks", "tasks assigned to me", or "their tasks" meaning the current user, use `list_tasks` with `assigned_to_me: true`. Do not use unassigned for current-user tasks.',
      '5. `get_task` with `space_id` and `task_id` only after the filtered list returns the needed id',
      '',
      'Search:',
      '- Use `search_space_context` when the user asks to find relevant Space context before opening exact items.',
    ].join('\n'),
  ),
  markdownResource(
    'vibey://mcp/workflows/brains',
    'Brain Workflow',
    'How to search and save Brain/context knowledge through MCP.',
    [
      '# Brain Workflow',
      '',
      'Use search-first behavior for Brain work. Do not list broad memory sets when a search can answer the user.',
      '',
      'Search:',
      '- Broad Brain search: `search_brains`.',
      '- User Brain: `search_user_brain`.',
      '- Customer Brain: `search_customer_brain`.',
      '- Company Brain: `search_company_brain`.',
      '- Agent Brain: `list_accessible_brains` or `resolve_agent_brain`, then `search_agent_brain`.',
      '- Campaign or Space context: `search_space_context`, not Brain search.',
      '',
      'Save:',
      '- Prefer `atlas_save_brain_context` for "save this to a brain" requests.',
      '- Use `save_user_memory` only when the user explicitly wants a direct user memory save.',
      '- Customer Brain save needs explicit contact context; do not invent customer identity.',
      '- Company Brain is object-based, so include a title and object_type when available.',
    ].join('\n'),
  ),
  markdownResource(
    'vibey://mcp/workflows/agent-skills',
    'Agent Skills Workflow',
    'How to create DB-backed Vibey agent skills and attach text or image references.',
    [
      '# Agent Skills Workflow',
      '',
      'Skills are database-first. They live in `agent_skills`; optional bundled references live in `agent_skill_resources`.',
      '',
      'Runtime behavior:',
      '- On Agent API restart or launch, agent sync rewrites runtime skill folders from database rows.',
      '- Filesystem copies are runtime artifacts, not the production source of truth.',
      '- A skill that only exists as a local `SKILL.md` file is not durable.',
      '',
      'Creation workflow:',
      '1. `list_agents` to choose `agent_key`.',
      '2. `list_agent_skills` with `agent_key` to avoid duplicate `skill_key` values.',
      '3. `create_agent_skill` with `agent_key`, `skill_key`, `name`, `description`, and `markdown_content`.',
      '4. `create_agent_skill_reference` for text, markdown, templates, or other textual references.',
      '5. `upload_agent_skill_image_reference` for image URL references.',
      '',
      'Image references:',
      '- Use `upload_agent_skill_image_reference` when the reference is an image URL.',
      '- The backend downloads the image, stores it in `skill-assets`, creates a skill resource, and returns the public URL/resource.',
      '- Use `description` as the human-readable reference label; it also helps form the stored resource path.',
      '',
      'Skill writing guidance:',
      '- The skill `description` is the trigger surface, so describe when the skill should be used.',
      '- Explain why important steps matter so the agent can generalize.',
      '- Keep the main skill content lean.',
      '- Put large examples, templates, schemas, and long references into skill references.',
      '- Use examples for fragile workflows or strict output formats.',
      '- Avoid over-specific instructions unless the workflow is fragile.',
    ].join('\n'),
  ),
  markdownResource(
    'vibey://mcp/workflows/campaigns',
    'Campaign Workflow',
    'How to inspect campaigns and continue into Spaces.',
    [
      '# Campaign Workflow',
      '',
      'Use campaign tools when the user asks about campaigns or campaign-owned work.',
      '',
      'Campaign path:',
      '1. `list_campaigns`',
      '2. `get_campaign` with `campaign_id`',
      '3. `list_spaces` with `campaign_id`',
      '',
      'Continue from campaign into Spaces:',
      '- Use `list_space_views`, `list_space_view_items`, and `get_space_item` for Space views and items.',
      '- Use `list_documents` and `read_space_document` for documents.',
      '- Use `list_tasks` and `get_task` for tasks.',
      '',
      'Keep campaign context separate from Brain search. Use Brain tools only when the user asks for Brain knowledge.',
    ].join('\n'),
  ),
  markdownResource(
    'vibey://mcp/workflows/missions',
    'Mission Operations Workflow',
    'How to launch, supervise, and verify Vibey mission execution.',
    [
      '# Mission Operations Workflow',
      '',
      'Use Missions when the user wants Vibey agents to execute a bounded body of work rather than only create an artifact directly.',
      '',
      'Launch:',
      '1. Resolve the destination with `list_campaigns` and `list_spaces`.',
      '2. Confirm the campaign and Space unless the user supplied exact ids.',
      '3. Call `create_mission` with the full brief, `campaign_id`, `space_id`, and a stable `idempotency_key`.',
      '4. Preserve the returned mission id for every supervision call.',
      '',
      'Supervise:',
      '- `get_mission` returns current mission state plus current subtasks and activity.',
      '- `get_mission_plan` returns the planned execution path.',
      '- `list_mission_subtasks` returns step-level status.',
      '- `get_mission_logs` returns execution evidence.',
      '- `get_mission_deliverables` returns durable outputs.',
      '',
      'Completion standard:',
      '- Mission creation is not proof of completion.',
      '- Report each requested check as PASS, FAIL, or BLOCKED.',
      '- Cite the mission id and exact subtask, log, or deliverable evidence behind every status.',
      '- Treat human gates, missing integrations, missing fixtures, and undeployed dependencies as BLOCKED rather than inventing a result.',
    ].join('\n'),
  ),
] as const satisfies readonly VibeyMcpResourceDefinition[]

@Injectable()
export class VibeyMcpResourceCatalogService {
  listResources() {
    return RESOURCES.map(({ uri, name, description, mimeType }) => ({
      uri,
      name,
      description,
      mimeType,
    }))
  }

  getResource(uri: string): VibeyMcpResourceDefinition | null {
    return RESOURCES.find((resource) => resource.uri === uri) ?? null
  }

  allResourceText(): string {
    return RESOURCES.map((resource) =>
      [resource.uri, resource.name, resource.description, resource.text].join('\n'),
    ).join('\n\n')
  }
}

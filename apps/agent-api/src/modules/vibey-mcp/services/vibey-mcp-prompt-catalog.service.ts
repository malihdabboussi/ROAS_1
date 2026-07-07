import { Injectable } from '@nestjs/common'

export interface VibeyMcpPromptMessage {
  role: 'user'
  content: {
    type: 'text'
    text: string
  }
}

export interface VibeyMcpPromptDefinition {
  name: string
  description: string
  arguments?: Array<{
    name: string
    description: string
    required?: boolean
  }>
  messages: VibeyMcpPromptMessage[]
}

function textPrompt(name: string, description: string, text: string): VibeyMcpPromptDefinition {
  return {
    name,
    description,
    arguments: [{ name: 'goal', description: 'Optional user goal to apply this workflow to.' }],
    messages: [{ role: 'user', content: { type: 'text', text } }],
  }
}

const PROMPTS = [
  textPrompt(
    'vibey_mcp_start_here',
    'Choose the right Vibey MCP workflow and inspect action contracts before writes.',
    [
      'Use Vibey MCP through read/list-first workflows.',
      '',
      'Start with tools/list when you need the available surface.',
      'Use describe_vibey_action before writes or unfamiliar tools so you have the exact input contract.',
      'Use search_vibey_docs for Vibey product, policy, and workflow questions before guessing.',
      'Use prompts/list for guided workflows and resources/list for longer Vibey MCP playbooks.',
      '',
      'Do not pass user_id or org_id. OAuth tokens define the current user and organization.',
    ].join('\n'),
  ),
  textPrompt(
    'vibey_spaces_navigation',
    'Navigate campaigns, Spaces, views, items, documents, and tasks.',
    [
      'Use this path when the user asks what exists inside a campaign or Space.',
      '',
      'Main Space path:',
      '1. list_campaigns',
      '2. list_spaces with campaign_id when known',
      '3. get_space and list_space_views with space_id to learn schema fields, status ids, view ids, and custom filters',
      '4. list_space_view_items with space_id, view_id, filters/search, fields="summary", bounded limit, and include_count when counts are needed',
      '5. get_space_item with space_id and item_id only after the filtered list returns the needed id',
      '',
      'Document path:',
      '1. list_spaces with campaign_id when known',
      '2. list_documents with space_id or campaign context, plus search or parent_item_id before increasing limit',
      '3. read_space_document with space_id and document_id only for selected documents',
      '',
      'Task path:',
      '1. list_spaces with campaign_id when known',
      '2. get_space to map user-created status/category/custom field ids',
      '3. list_tasks with status/category/filters/search, fields="summary", bounded limit, and include_count when counts are needed',
      '4. For "my tasks", "tasks assigned to me", or "their tasks" meaning the current user, use list_tasks with assigned_to_me=true. Do not use unassigned for current-user tasks.',
      '5. get_task with space_id and task_id only after the filtered list returns the needed id',
      '',
      'Use search_space_context when the user asks to find relevant context inside a Space before opening exact items.',
    ].join('\n'),
  ),
  textPrompt(
    'vibey_brain_search_and_save',
    'Search Brain knowledge and save knowledge through the Atlas router.',
    [
      'Use search-first behavior for Brain work.',
      '',
      'Search paths:',
      '- For broad questions, use search_brains.',
      '- For user Brain, use search_user_brain.',
      '- For customer Brain, use search_customer_brain.',
      '- For company Brain, use search_company_brain.',
      '- For agent Brain, use list_accessible_brains or resolve_agent_brain, then search_agent_brain.',
      '- For campaign or Space context, use search_space_context instead of Brain search.',
      '',
      'Save path:',
      '- For "save this to any brain" requests, prefer atlas_save_brain_context.',
      '- Company Brain is object-based; include a useful title and object_type when available.',
      '- Customer Brain saves need explicit contact context. Do not invent contact identity.',
      '- Use save_user_memory only when the user explicitly wants a direct user memory save.',
    ].join('\n'),
  ),
  textPrompt(
    'vibey_create_agent_skill',
    'Create DB-backed skills for existing Vibey agents and attach text or image references.',
    [
      'Use this workflow when creating a new skill for an existing Vibey agent.',
      '',
      'Skills are database-first. The durable source of truth is agent_skills plus optional agent_skill_resources. Runtime filesystem copies are generated from the database and are not the production source of truth.',
      '',
      'Workflow:',
      '1. list_agents to choose agent_key.',
      '2. list_agent_skills with agent_key to avoid duplicate skill_key values.',
      '3. create_agent_skill with agent_key, skill_key, name, description, and markdown_content.',
      '4. create_agent_skill_reference for text or markdown reference files.',
      '5. upload_agent_skill_image_reference for image URL references.',
      '',
      'Image reference behavior:',
      '- Use upload_agent_skill_image_reference when the reference is an image URL.',
      '- The backend downloads the image, stores it in skill-assets, creates a skill resource, and returns the public URL/resource.',
      '- Use description as the human-readable image reference label.',
      '',
      'Skill writing guidance:',
      '- The description is the trigger surface, so describe when the skill should be used.',
      '- Explain why important steps matter.',
      '- Keep the main skill lean and put large examples or templates in references.',
      '- Use examples for fragile workflows.',
      '- Avoid over-specific instructions unless the workflow is fragile.',
    ].join('\n'),
  ),
  textPrompt(
    'vibey_campaign_work',
    'Work from campaigns into Spaces without confusing campaign context with Brain search.',
    [
      'Use this workflow when the user asks about campaigns or campaign-owned work.',
      '',
      'Campaign path:',
      '1. list_campaigns',
      '2. get_campaign with campaign_id',
      '3. list_spaces with campaign_id',
      '',
      'From there, use the Spaces workflow for views, items, documents, and tasks.',
      'Use Brain search only when the user asks for Brain knowledge. Use search_space_context for campaign or Space context.',
    ].join('\n'),
  ),
] as const satisfies readonly VibeyMcpPromptDefinition[]

@Injectable()
export class VibeyMcpPromptCatalogService {
  listPrompts() {
    return PROMPTS.map(({ name, description, arguments: args }) => ({
      name,
      description,
      ...(args ? { arguments: args } : {}),
    }))
  }

  getPrompt(name: string): VibeyMcpPromptDefinition | null {
    return PROMPTS.find((prompt) => prompt.name === name) ?? null
  }

  allPromptText(): string {
    return PROMPTS.map((prompt) =>
      [
        prompt.name,
        prompt.description,
        ...prompt.messages.map((message) => message.content.text),
      ].join('\n'),
    ).join('\n\n')
  }
}

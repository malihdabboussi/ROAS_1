export type AgentInstructionContractId =
  | 'space-retrieval-protocol'
  | 'space-schema-mutation-protocol'
  | 'brain-knowledge-protocol'
  | 'skill-usage-protocol'
  | 'tool-schema-protocol'
  | 'data-grounding-protocol'
  | 'flow-building-protocol'
  | 'planning-protocol'
  | 'persistence-protocol'
  | 'clarification-protocol'
  | 'delegation-protocol'

export type AgentInstructionContractScope = {
  audience: 'all-working-agents'
  skillKey: 'vibey-api'
}

export type AgentInstructionExample = {
  userRequest: string
  use: string
  reason: string
}

export type AgentInstructionContract = {
  id: AgentInstructionContractId
  version: number
  title: string
  summary: string
  scope: AgentInstructionContractScope
  why: string
  instruction: string
  requiredActions: string[]
  requiredConcepts: string[]
  examples: AgentInstructionExample[]
}

function shouldRenderContract(
  contract: AgentInstructionContract,
  skillKey: AgentInstructionContractScope['skillKey'],
  availableActions: Set<string>,
): boolean {
  if (contract.scope.skillKey !== skillKey) return false
  return contract.requiredActions.every((action) => availableActions.has(action))
}

export function getAgentInstructionContractsForSkill(
  skillKey: AgentInstructionContractScope['skillKey'],
  availableActions: Set<string>,
): AgentInstructionContract[] {
  return AGENT_INSTRUCTION_CONTRACTS.filter((contract) =>
    shouldRenderContract(contract, skillKey, availableActions),
  )
}

function toProtocolSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getAgentInstructionContractReferencePath(
  contract: AgentInstructionContract,
): string {
  return `references/protocols/${toProtocolSlug(contract.title)}.md`
}

export function renderAgentInstructionContract(contract: AgentInstructionContract): string {
  const examples = contract.examples
    .map(
      (example) =>
        `- User asks: ${example.userRequest}\n  Use: ${example.use}\n  Why: ${example.reason}`,
    )
    .join('\n')

  return [
    `### ${contract.title}`,
    `Protocol version: ${contract.version}`,
    `When to read: ${contract.summary}`,
    `Why: ${contract.why}`,
    `Required concepts: ${contract.requiredConcepts.join(', ')}`,
    contract.instruction,
    'Examples:',
    examples,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function renderAgentInstructionContractsForSkill(
  skillKey: AgentInstructionContractScope['skillKey'],
  availableActions: Set<string>,
): string {
  return getAgentInstructionContractsForSkill(skillKey, availableActions)
    .map(renderAgentInstructionContract)
    .join('\n\n')
}

export function renderAgentInstructionContractIndexForSkill(
  skillKey: AgentInstructionContractScope['skillKey'],
  availableActions: Set<string>,
): string {
  const contracts = getAgentInstructionContractsForSkill(skillKey, availableActions)
  if (contracts.length === 0) return ''

  const rows = contracts.map(
    (contract) =>
      `| ${contract.title} | v${contract.version} | \`${getAgentInstructionContractReferencePath(contract)}\` | ${contract.summary} |`,
  )

  return [
    'Read the matching protocol reference before choosing backend actions when the request matches that protocol.',
    '',
    '| Protocol | Version | Reference | Use when |',
    '|---------|---------|-----------|----------|',
    rows.join('\n'),
  ].join('\n')
}

export const AGENT_INSTRUCTION_CONTRACTS: AgentInstructionContract[] = [
  {
    id: 'space-retrieval-protocol',
    version: 1,
    title: 'Space Retrieval Protocol',
    summary:
      'Use for active Space retrieval: semantic context questions, structured browse/count/filter requests, and exact object reads.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Spaces are embedded work contexts, not only lists of tasks or documents. One retrieval protocol lets agents choose semantic, query, or exact-object mode from the user intent instead of bouncing between separate instructions.',
    instruction: [
      'Treat the active Space as the first source of workspace knowledge when the user asks for context across their work. Route by intent: semantic mode for knowledge/context, query mode for browse/count/filter workflows, and exact mode when the object is already identified.',
      "Use semantic mode with `search_space_context` when the request is about what exists, what was decided, where something lives, what relates to a topic, or what the agent should know before acting. Start broad, then follow each result's `retrieve_via` hint to exact tools such as `read_space_document`, `get_task`, `get_mission`, or `get_mission_deliverables` only when the full object is needed.",
      'Use query mode for browse, count, inventory, and selection requests. Query first and inspect second: do not list hundreds of Space items to find a few matches. Use filtered list actions with a small `limit`, `fields: "summary"`, and `include_count: true` when the user asks for counts.',
      'Discover the filter vocabulary before filtering. Call `get_space` or `list_space_views`/`get_space_view` to read `schema.fields`, view ids, status option ids, and custom field ids. Map user labels to current Space option ids before calling `list_tasks` or `list_space_view_items`.',
      'Use the narrowest list action that fits. Use `list_tasks` for task rows, `list_documents` for Space Docs and folder children, and `list_space_view_items` for research/custom views such as IG, TikTok, YouTube, X, artifacts, media, or a custom table.',
      'Put filters in the action payload, not in your own post-processing. Use top-level filters such as `status`, `assigned_to_me`, `assignee_id`, `parent_item_id`, `search`, and `category` when available; use `filters` for schema/custom_data keys such as `severity`, `_view_type`, `_platform`, `_handle`, or other view-specific fields.',
      'For requests like "my tasks", "tasks assigned to me", or "their tasks" when "their" refers to the current user, call `list_tasks` with `assigned_to_me: true`. Do not use `assignee_type: "unassigned"` for those requests, and do not ask the user for their internal user id.',
      'Use exact mode when the exact object is already identified by id or by current visible context. Skip semantic search and list calls, then call the exact `get_*` or `read_*` action.',
      'Ask for full objects only after semantic or filtered query results return the few ids you need. Use summary lists for discovery and exact get/read actions for final details, bodies, activity, or edits.',
      'Keep Space scope aligned with the active session. Do not widen search across Spaces unless the user explicitly asks for another Space or a cross-Space search capability is available.',
    ].join('\n\n'),
    requiredActions: ['search_space_context'],
    requiredConcepts: [
      'active Space',
      'embedded work context',
      'semantic mode',
      'query mode',
      'exact mode',
      'semantic Space retrieval',
      'retrieve_via',
      'query first and inspect second',
      'schema.fields',
      'view ids',
      'status option ids',
      'custom field ids',
      'filtered list action',
      'fields summary',
      'include_count',
      'filters object for custom_data keys',
      'assigned_to_me for current user task ownership',
      'exact get/read action when object is identified',
    ],
    examples: [
      {
        userRequest: 'What did we decide about launch approval?',
        use: 'Semantic mode: `search_space_context`, then follow `retrieve_via` if the source object is needed.',
        reason:
          'The user is asking for a decision across Space knowledge, not for an inventory list.',
      },
      {
        userRequest: 'How many bugs are fixed not pushed?',
        use: 'Query mode: `get_space` to map the team status/category fields, then `list_tasks` with `status`, `category` or `filters`, `include_count: true`, `fields: "summary"`, and a small `limit`.',
        reason:
          'The user wants a count and a filtered task subset, so the backend query should filter before returning rows.',
      },
      {
        userRequest: 'Show me tasks assigned to me.',
        use: 'Query mode: `get_space`, then `list_tasks` with `assigned_to_me: true`, `fields: "summary"`, `include_count: true`, and a bounded `limit`.',
        reason:
          'The current user identity comes from the session, and Home > My Tasks includes multi-assignee task rows.',
      },
      {
        userRequest: 'Show me TikTok outliers from this Space.',
        use: '`list_space_views` to find the TikTok research view, then `list_space_view_items` with `_view_type`/platform filters and `fields: "summary"`.',
        reason: 'Research rows are Space items but not generic tasks.',
      },
      {
        userRequest: 'Open the folder contents.',
        use: '`list_documents` with `space_id`, `parent_item_id`, and a bounded `limit`, then `read_space_document` only for a selected file.',
        reason: 'Folder children are document rows and should be filtered before the list limit.',
      },
      {
        userRequest: 'Open task 123.',
        use: 'Exact mode: `get_task`.',
        reason: 'The exact object is already identified, so semantic search adds noise.',
      },
    ],
  },
  {
    id: 'space-schema-mutation-protocol',
    version: 2,
    title: 'Space Schema Mutation Protocol',
    summary:
      'Use when the user asks to add or edit real Space fields, columns, properties, dropdowns, statuses, categories, tags, or select options.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Space fields define the schema users see in views, task/detail panels, and Flow configuration. When a Flow depends on a missing status, category, tag, or field, schema alignment creates the real option ids the Flow runtime can validate instead of leaving Loop blocked on user-facing vocabulary.',
    instruction: [
      'Read the live schema first with `get_space`. Inspect `schema.fields`, `schema.views`, existing field ids, and visible view ids before mutating anything.',
      'Use `create_space_field` for real schema fields. This is the correct action when the user asks for a new field, column, property, dropdown, multi-select, date, number, checkbox, currency, URL, email, phone, rating, progress, files/media, or contact field.',
      'Do not fake schema changes by writing only `custom_data`. `custom_data` can store values for fields that already exist, but it does not create a visible field definition in the Space schema.',
      'For `select` and `multi_select`, send `options` when the user gave labels. Preserve user-provided option ids/colors only when they are explicit; otherwise let the backend generate option ids and default colors.',
      'When a requested Flow needs a missing status, category, tag, or other select option, align the active Space schema before planning the Flow. The Flow plan should reference real option ids from the updated schema, not invented labels.',
      'Adding a status is a `create_space_status` call, not `create_space_field` and not a manual full-options replacement. Use `create_space_status` after `get_space`; the backend preserves existing status options and returns the created option id.',
      'For categories and tags, use `create_space_category` and `create_space_tag`. For any other existing select or multi-select field, use `append_space_field_option` with the exact field_id from `get_space`.',
      'Use `create_space_view` when the user asks for a new Space view, and `update_space_view` when they ask to rename or reconfigure an existing view. Only use existing field ids in visible_field_ids.',
      'Use `visible_in_view_ids` only for existing views from `get_space` or `list_space_views`. This makes a field visible without removing it from other views.',
      'Use `update_space_field` only to rename non-system fields, replace select/multi-select options, or show a field in existing views. It cannot change field id, field type, system status, or delete fields.',
      'If the user asks to delete a field, explain that field deletion is not exposed in the agent toolkit yet.',
    ].join('\n\n'),
    requiredActions: [
      'get_space',
      'create_space_field',
      'update_space_field',
      'append_space_field_option',
      'create_space_status',
      'create_space_category',
      'create_space_tag',
      'create_space_view',
      'update_space_view',
    ],
    requiredConcepts: [
      'schema.fields',
      'schema.views',
      'field id',
      'field type',
      'select options',
      'multi-select options',
      'schema alignment before Flow planning',
      'status options on the system status field',
      'append-only option helper',
      'visible_in_view_ids',
      'visible_field_ids',
      'custom_data is not schema',
      'field deletion is not available',
    ],
    examples: [
      {
        userRequest:
          'Build a flow that moves new bugs into QA Review, and add QA Review if it is missing.',
        use: '`get_space`, add QA Review with `create_space_status`, then continue the Flow build with the returned option id.',
        reason:
          'The user needs a Flow option that does not exist yet, so schema alignment must happen before planning.',
      },
      {
        userRequest: 'Add a multi-select field called Launch Tags with Hot and Warm.',
        use: '`get_space`, then `create_space_field` with `type: "multi_select"` and the two option labels.',
        reason: 'The user wants a visible schema field, not a hidden custom_data key on one task.',
      },
      {
        userRequest: 'Rename Source to Lead Source and show it in the board view.',
        use: '`get_space` to confirm the field and board view id, then `update_space_field` with `name` and `visible_in_view_ids`.',
        reason: 'The field already exists, so the schema update should preserve its id and values.',
      },
      {
        userRequest: 'Add a Due Date column to this task table.',
        use: '`get_space`, then `create_space_field` with `type: "date"` and the existing table view id in `visible_in_view_ids`.',
        reason:
          'A visible column needs a schema field and view placement, not only a value on one task.',
      },
    ],
  },
  {
    id: 'brain-knowledge-protocol',
    version: 1,
    title: 'Brain Knowledge Protocol',
    summary:
      'Use when the answer may live in durable user, company, agent, customer, or cross-brain memory.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Brain is durable knowledge that survives conversations. Choosing the right Brain family keeps personal preferences, company rules, agent expertise, and customer knowledge distinct, so agents retrieve evidence from the right long-term memory instead of mixing scopes.',
    instruction: [
      'Use Brain when the user asks about remembered facts, preferences, strategy, customer patterns, company rules, agent expertise, or knowledge that should persist beyond the current Space or conversation.',
      "Search the most specific Brain family first. Use `search_user_brain` for the user's personal knowledge, preferences, decisions, and working style. Use `search_company_brain` for company-wide rules, positioning, policies, strategy, and shared operating context. Use `resolve_agent_brain` before `search_agent_brain` when the knowledge belongs to a specific agent role. Use `search_customer_brain` for customer, avatar, interview, prospect, and account knowledge.",
      'Use `search_brain_context` only when the user asks to search all brains, every accessible brain, shared brains, or multiple Brain families. Cross-Brain search is useful for broad discovery, but family-specific search is more precise when the target is clear.',
      'Use `get_brain_pages` when the user asks for structured curated knowledge such as pages, playbooks, rules, docs, or a library. If pages are empty or too broad, use semantic Brain search next.',
      'Treat Brain search results as evidence, not permission to guess. When results say context is insufficient, search again with a better query or ask the user rather than presenting an unsupported memory as fact.',
    ].join('\n\n'),
    requiredActions: [
      'search_user_brain',
      'search_company_brain',
      'resolve_agent_brain',
      'search_agent_brain',
      'search_customer_brain',
      'search_brain_context',
      'get_brain_pages',
    ],
    requiredConcepts: [
      'durable knowledge',
      'most specific Brain family first',
      'user personal knowledge',
      'company-wide rules',
      'specific agent role',
      'customer knowledge',
      'cross-Brain search only for multiple/all brains',
      'curated knowledge pages',
      'context is insufficient',
    ],
    examples: [
      {
        userRequest: 'What do you remember about how I like landing pages?',
        use: 'search_user_brain.',
        reason: "The request is about the user's personal preferences and working style.",
      },
      {
        userRequest: 'What are our company rules around publishing?',
        use: 'search_company_brain.',
        reason: 'Publishing rules are shared company operating knowledge.',
      },
      {
        userRequest: 'What does the copywriter know about objection handling?',
        use: 'resolve_agent_brain, then search_agent_brain.',
        reason: 'The target knowledge belongs to a specific agent role.',
      },
      {
        userRequest: 'Search all our brains for pricing decisions.',
        use: 'search_brain_context.',
        reason: 'The user explicitly asked for a cross-Brain search.',
      },
    ],
  },
  {
    id: 'skill-usage-protocol',
    version: 1,
    title: 'Skill Usage Protocol',
    summary:
      'Use when backend actions need to be paired with the right workflow skill for deliverable quality.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Skills are the workflow layer above raw actions. They teach the agent how to produce a deliverable well, while `vibey-api` teaches the agent how to call the platform safely. Reading the right skill before work prevents agents from treating backend actions as the whole craft process.',
    instruction: [
      'Use `SKILLS.md` as the runtime skill index when the task type is not obvious. Read the matching `skills/{skill-key}/SKILL.md` before creating, editing, publishing, or reviewing a meaningful deliverable.',
      'Treat `vibey-api` as the action contract skill, not as a replacement for workflow skills. Use workflow skills for craft decisions, quality bars, and task sequence. Use `vibey-api` and current tool schemas for exact payloads; use `describe_action` only when the contract is still missing or uncertain.',
      'Prefer one relevant workflow skill over reading many. Load additional skills only when the work crosses domains, such as a presentation that also needs email copy or an ad that also needs image production.',
      'When a user names a deliverable directly, map it to the most specific skill first: presentations to `presentation-builder`, funnels to `funnel-builder`, sequences to `email-sequence-builder`, ads to `ad-builder`, social content to `social-content-builder`, and apps/projects to `project-builder`.',
    ].join('\n\n'),
    requiredActions: [],
    requiredConcepts: [
      'SKILLS.md',
      'skills/{skill-key}/SKILL.md',
      'workflow skill',
      'vibey-api as action contract skill',
      'one relevant workflow skill',
      'cross-domain work',
    ],
    examples: [
      {
        userRequest: 'Build me a pitch deck.',
        use: 'Read `skills/presentation-builder/SKILL.md`, then use `vibey-api` for `create_presentation` contract details.',
        reason:
          'The skill defines the deck workflow and quality bar; the API skill defines the save action.',
      },
      {
        userRequest: 'What tools can you use for this?',
        use: 'Read `skills/vibey-api/SKILL.md` and the relevant reference section.',
        reason: 'The user is asking about platform action capability, not deliverable craft.',
      },
      {
        userRequest: 'Create a LinkedIn carousel and publish it.',
        use: 'Read `social-content-builder`, then `social-publisher`, and verify publish action contracts with `vibey-api`.',
        reason:
          'Creation and publishing are related but distinct workflows with different safety checks.',
      },
    ],
  },
  {
    id: 'tool-schema-protocol',
    version: 2,
    title: 'Tool Schema Protocol',
    summary:
      'Use before backend action calls when payload keys, aliases, types, or action fit are uncertain.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Backend actions are strict contracts. Guessing field names creates failed runs, duplicate artifacts, or silent wrong writes. Schema-first action use lets the agent move fast while respecting the platform shape.',
    instruction: [
      'Before calling a backend action, verify the exact schema from current context, the relevant `vibey-api` reference file, or the visible tool schema. Use `describe_action` only when required keys, optional keys, aliases, or action fit are still uncertain after those sources.',
      'Build payloads from the action contract, not from memory. Use exact snake_case keys, required fields, accepted aliases, and documented types. Do not send fields just because a nearby action accepts them.',
      'For Space list actions, verify both the action contract and the live Space/view schema. Action schemas tell you which query keys exist; `get_space` and view metadata tell you which user-defined status/category/custom field ids are valid for that Space.',
      'Check `useWhen` and `doNotUseWhen` before choosing between similar actions. For example, update an existing artifact when the user asked to change it; create a new artifact only when the user asked for a new one.',
      'If schema preflight fails, do not retry the same payload unchanged. Read the error as contract feedback, correct the payload, then call again only when the correction is clear.',
    ].join('\n\n'),
    requiredActions: [],
    requiredConcepts: [
      'exact schema',
      'snake_case keys',
      'required fields',
      'accepted aliases',
      'documented types',
      'live Space/view schema',
      'useWhen',
      'doNotUseWhen',
      'schema preflight fails',
    ],
    examples: [
      {
        userRequest: 'Rename this presentation.',
        use: 'Check the `update_presentation` contract from `vibey-api`, then send `presentation_id` and `name`.',
        reason: 'Rename is an update, not a new presentation or full bundle replacement.',
      },
      {
        userRequest: 'Change this existing ad image.',
        use: 'Use `update_ad` after checking its contract; do not call `create_ad`.',
        reason: 'The user asked to modify an existing artifact.',
      },
      {
        userRequest: 'The action failed with unknown field.',
        use: 'Read the action contract/error, remove or rename the invalid field, then retry only the corrected payload.',
        reason: 'Repeating the same payload wastes a turn and repeats the same tool error.',
      },
    ],
  },
  {
    id: 'data-grounding-protocol',
    version: 1,
    title: 'Data Grounding Protocol',
    summary:
      'Use whenever platform data, schemas, agent definitions, memory, current context, or user-owned artifacts can answer the question or constrain the action.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Vibey is data-driven. Space, Brain, skills, tool schemas, agent definitions, and user context are the source of truth. Guessing creates wrong work, wasted retries, broken actions, and false memory.',
    instruction: [
      'Do not guess when the platform can know. If the answer may already exist in Space, Brain, current context, user-owned artifacts, agent definitions, or a skill, retrieve or read that source before answering or acting.',
      'Use schemas and contracts as constraints, not suggestions. If an action schema, Space schema, integration contract, or skill reference is available, build the next step from that source rather than from memory or similar actions.',
      'When evidence is insufficient, search again with a better query, inspect the exact object, or ask the user. Do not present unsupported memory, invented ids, guessed field names, or assumed preferences as fact.',
      'Only make assumptions when they are low-impact, clearly stated, and cheaper than interrupting the user. If an assumption changes a deliverable, writes data, spends credits, publishes, sends, deletes, or selects between meaningful options, retrieve evidence or clarify first.',
    ].join('\n\n'),
    requiredActions: [],
    requiredConcepts: [
      'Do not guess when the platform can know',
      'data-driven',
      'source of truth',
      'retrieve or read',
      'schemas and contracts as constraints',
      'evidence is insufficient',
      'unsupported memory',
      'invented ids',
      'guessed field names',
      'low-impact assumptions',
    ],
    examples: [
      {
        userRequest: 'What do we usually say in launch emails?',
        use: 'Search Brain or Space for launch email examples and preferences before summarizing.',
        reason:
          'The answer may exist in durable memory or previous artifacts, so retrieval is more reliable than generic marketing knowledge.',
      },
      {
        userRequest: 'Add the Priority column to this Space view.',
        use: 'Read the live Space schema and view metadata before sending schema/view updates.',
        reason:
          'Field ids and view ids are user-owned platform data; guessing them creates invisible or broken changes.',
      },
      {
        userRequest: 'Publish this campaign.',
        use: 'Verify the target campaign, publish contract, and approval requirements; clarify if the target or timing is ambiguous.',
        reason:
          'Publishing has external impact, so assumptions are high-impact and need evidence or confirmation.',
      },
    ],
  },
  {
    id: 'flow-building-protocol',
    version: 2,
    title: 'Flow Building Protocol',
    summary:
      'Use when planning, drafting, validating, editing, testing, or publishing Space automation flows.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Flows execute inside Spaces and can trigger connected apps, agents, tasks, Brain context, content, and custom reusable blueprints. Context loading, capability search, clarification, validation, and evaluation keep agents from inventing unsupported automation steps or publishing incomplete rules.',
    instruction: [
      'Start with `get_flow_build_context` for the active Space, then `search_flow_capabilities` with a narrow query, kind, category, or bounded limit. Use `get_flow_capability` for exact required fields when a result is ambiguous.',
      '`get_flow_build_context` returns `workflow_capabilities` in addition to the compile-ready Flow catalog. Treat `trigger.*` and `action.*` entries with `execution.executor:"space_automation"` as compile-ready Flow steps. Treat `agent_action.*` entries as platform-capable workflow candidates only; do not put them into `create_flow_plan` actions unless an active blueprint or Flow runtime bridge exists for that action.',
      'Use `workflow_capabilities` to decide whether Loop should draft a reusable blueprint, ask for an admin-authored contract, or block with a clear missing executor reason when the platform can do the work but Flow runtime cannot yet execute it.',
      'If the requested Flow depends on a missing status, category, tag, or field, read the Space Schema Mutation Protocol first when it is listed in this API skill. Align the Space schema before creating the plan; if schema actions are not available, clarify or record the blocker instead of inventing an option.',
      'The server harness owns the active Flow build session and selected update target. Do not ask for, mention, copy, or manually manage flow build session IDs.',
      'For plan continuation actions, omit `session_id` unless the backend explicitly returns a blocker requiring a specific session. The backend attaches the active build session for `update_flow_plan`, `answer_flow_clarification`, `validate_flow_plan`, `compile_flow_plan`, and `evaluate_flow_plan`.',
      'When the Flows context says `flow_build_session: server_managed_active`, continue that active build by updating, validating, compiling, or evaluating the plan. Do not restart the build unless the user explicitly asks for a different flow.',
      'Never ask the user for internal IDs, UUIDs, status IDs, field IDs, view IDs, agent IDs, connected account IDs, or integration IDs in chat. Resolve them from build context, exact list/get actions, and capability details the same way Atlas resolves Brain targets.',
      'If a required value cannot be resolved automatically, call `create_flow_clarification` before creating a plan. Use the Flow clarification question shape (`id`, `text`, `type`, `options`, `required`) and ask for labels or intent, not internal IDs.',
      'Clarification questions must ask for human choices by label or intent, not internal IDs. Example: ask “Which Done status should this use?” with choices, not “What is the Done status ID?”',
      'Prefer premade capabilities. Use `list_flow_blueprints` and `get_flow_blueprint` only when no premade trigger/action covers the requested step or the user explicitly asks for a reusable custom step.',
      'For custom steps, create `create_flow_blueprint_draft` only when the blueprint compiles to supported existing automation action payloads. Never create hidden action types, arbitrary code, guessed connected-app triggers, or external API calls outside existing tools.',
      'For first-party inbound webhook Flows, use `trigger.webhook_received` with `webhook_endpoint_id`. Webhook payload templates use `{{trigger.payload}}`, endpoint mapped fields use `{{trigger.fields.customer_email}}`, and metadata uses `{{trigger.webhook.event_id}}` / `{{trigger.webhook.received_at}}`.',
      'Use `create_flow_clarification` when a missing value changes execution, such as status choice, field choice, connected account, form, channel, webhook endpoint, schedule, repo, or recipient. After answers arrive, continue with `answer_flow_clarification` if needed, then create or update the plan.',
      'Create a plan with `create_flow_plan` only after required clarifications are answered or unnecessary. Keep `intent` to 1-2 sentences; put trigger/action workflow detail in `trigger` and `actions`, not in `intent`. Then update it with `update_flow_plan`, validate with `validate_flow_plan`, and compile with `compile_flow_plan` into a disabled `space_automations` draft. Drafts must stay `is_draft: true` and `enabled: false` until validation and publish.',
      'Call `validate_flow_draft` before `publish_flow` on compiled drafts. If validation returns errors, fix the plan/draft or ask for missing input; never publish after failed validation.',
      'If `publish_flow` says backend sync is required, stop and direct the admin to publish from `/flows`; schedule, webhook, connected-app/external, and contact trigger publishing must run through the Flows API so endpoint validation, routes, and next-fire fields sync.',
      'After a non-trivial planning session, call `evaluate_flow_plan` so the admin dashboard can inspect tool-call count, clarification quality, premade reuse, custom blueprint use, schema errors, and unsupported requests.',
      'Keep scope aligned to the active Space. Omit `space_id` when the runtime already provides it, and never write to another Space unless the user explicitly named that Space.',
      'Use `list_flows` and `get_flow` before editing existing flows so edits preserve current trigger/action payloads instead of replacing unknown fields.',
    ].join('\n\n'),
    requiredActions: [
      'search_flow_capabilities',
      'get_flow_capability',
      'list_flows',
      'get_flow',
      'create_flow_draft',
      'update_flow_draft',
      'validate_flow_draft',
      'publish_flow',
      'get_flow_build_context',
      'create_flow_clarification',
      'create_flow_plan',
      'update_flow_plan',
      'answer_flow_clarification',
      'validate_flow_plan',
      'compile_flow_plan',
      'list_flow_blueprints',
      'get_flow_blueprint',
      'create_flow_blueprint_draft',
      'validate_flow_blueprint',
      'activate_flow_blueprint',
      'evaluate_flow_plan',
    ],
    requiredConcepts: [
      'active Space scope',
      'Space context before planning',
      'capability search first',
      'workflow_capabilities',
      'agent_action candidates need a runtime bridge',
      'premade capabilities before custom blueprints',
      'custom blueprints compile to existing action payloads',
      'missing required fields',
      'schema alignment before planning',
      'disabled drafts',
      'validate before publish',
      'never invent unsupported actions',
      'evaluation traces',
      'preserve current payloads when editing',
    ],
    examples: [
      {
        userRequest: 'When a task moves to Done, ask the agent to write the follow-up.',
        use: '`get_flow_build_context`, inspect `workflow_capabilities` for compile-ready Flow steps versus `agent_action.*` candidates, resolve the Done status from field option refs or exact Space list/get actions, align the Space schema first if the needed status is missing, `search_flow_capabilities` for supported status triggers/actions, then `create_flow_plan`. If the desired agent action is only `agent_action.*`, draft or request a blueprint instead of compiling it directly.',
        reason:
          'Status ids are Space-specific platform data that Loop must resolve or capture through inspector clarifications, not ask the user to provide manually.',
      },
      {
        userRequest: 'Publish this flow.',
        use: '`get_flow`, then `validate_flow_draft`, then `publish_flow` only if validation succeeds; if backend sync is required, send the admin to `/flows` publish.',
        reason:
          'Publishing activates automation execution and must pass validation plus backend route/schedule sync first.',
      },
      {
        userRequest: 'Make a custom action that posts to our tool.',
        use: 'Search capabilities and blueprints first. If no existing capability can do it, create a blocked plan or promotion candidate instead of inventing an external action.',
        reason:
          'Custom blueprints are reusable wrappers around supported action payloads, not arbitrary external integrations.',
      },
    ],
  },
  {
    id: 'planning-protocol',
    version: 1,
    title: 'Planning Protocol',
    summary:
      'Use for multi-step, cross-artifact, expensive, irreversible, or choice-heavy platform work.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Planning protects multi-step work from becoming a chain of disconnected tool calls. A short plan gives the agent a route, lets the user correct direction early, and keeps expensive or irreversible work aligned with intent.',
    instruction: [
      'Plan when work has multiple dependent steps, touches multiple artifacts, uses multiple skills, is expensive, or has meaningful choices. Keep the plan short, concrete, and action-oriented.',
      'Do not plan for trivial, reversible work. If the user asks for a small edit and the target is clear, inspect the source and act.',
      'A useful plan states the goal, the next few actions, the evidence needed, and the approval point if one exists. Avoid verbose essays; the plan should make execution easier.',
      'Update the plan when new evidence changes the path. Do not keep following an obsolete plan after retrieval, schema checks, or user feedback changes the facts.',
    ].join('\n\n'),
    requiredActions: [],
    requiredConcepts: [
      'multiple dependent steps',
      'multiple artifacts',
      'multiple skills',
      'expensive or irreversible work',
      'approval point',
      'update the plan when new evidence changes the path',
    ],
    examples: [
      {
        userRequest: 'Create a launch deck, email sequence, and social posts.',
        use: 'Plan the asset order, required context, skills, and save points before creating anything.',
        reason: 'The work crosses multiple deliverables and skills.',
      },
      {
        userRequest: 'Change this headline to "Built for operators".',
        use: 'Inspect the target and patch directly.',
        reason: 'The task is small, clear, and reversible.',
      },
      {
        userRequest: 'Publish this campaign tomorrow.',
        use: 'Plan the confirmation and scheduling path before any send/publish action.',
        reason: 'Publishing is time-sensitive and user-visible.',
      },
    ],
  },
  {
    id: 'persistence-protocol',
    version: 1,
    title: 'Persistence Protocol',
    summary:
      'Use when completed or in-progress work should become durable platform assets or state.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Vibey work only becomes useful when it lands in the platform. Chat-only output is easy to lose, cannot appear in previews, and cannot be reused by other agents. Persistence turns agent work into durable user assets.',
    instruction: [
      'Save completed deliverables through the platform action that owns that artifact. Use the canonical create/update action rather than leaving final work only in chat.',
      'After meaningful progress, persist working state when the agent has a state action available. State should capture active work, blockers, pending approvals, and important ids, not a transcript dump.',
      'Attach work to the current campaign or Space through inherited runtime scope unless the user explicitly named a different scope. Do not invent ids or pass scope fields that the runtime resolves automatically.',
      'Verify save responses. If the response returns an id or success marker, carry that id into the next dependent action. If the save fails, correct the cause before claiming the work is saved.',
    ].join('\n\n'),
    requiredActions: ['patch_state'],
    requiredConcepts: [
      'durable user assets',
      'canonical create/update action',
      'working state',
      'current campaign or Space',
      'inherited runtime scope',
      'verify save responses',
      'carry that id',
    ],
    examples: [
      {
        userRequest: 'Make the deck.',
        use: 'Create or update the presentation artifact, then summarize the saved result.',
        reason: 'The user needs a durable deck in the product, not only source text in chat.',
      },
      {
        userRequest: 'We are blocked until Sarah approves.',
        use: 'Update working state if available with the blocker and pending approval.',
        reason: 'Future turns need to know why the work paused.',
      },
      {
        userRequest: 'Add a page to this funnel.',
        use: 'Use the existing funnel id from context or retrieval, then use the returned page id for dependent edits.',
        reason: 'Dependent actions need the persisted object id.',
      },
    ],
  },
  {
    id: 'clarification-protocol',
    version: 1,
    title: 'Clarification Protocol',
    summary:
      'Use when missing inputs, ambiguity, destructive actions, publishing, cost, or preferences make guessing risky.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: 'Good agents reduce user effort, but guessing is expensive when the choice changes the deliverable, spends credits, publishes content, or deletes data. Clarification is the safety valve for high-impact ambiguity.',
    instruction: [
      'Ask a clarification question when a required input is missing, scope is ambiguous, the action is destructive, the action publishes or sends, the work is expensive, or the user preference materially changes the output.',
      'Do not ask when the answer is already in current context, Space, Brain, or the relevant artifact. Retrieve first when retrieval is cheaper than interrupting the user.',
      'Keep clarification focused. Ask one or two questions, offer concrete options when possible, and name the recommended default with a short reason.',
      'Use structured clarification UI when the channel supports it and the input needs structure. Use plain text in channels that do not support cards.',
    ].join('\n\n'),
    requiredActions: [],
    requiredConcepts: [
      'required input is missing',
      'scope is ambiguous',
      'destructive',
      'publishes or sends',
      'expensive',
      'retrieve first',
      'recommended default',
      'channel supports it',
    ],
    examples: [
      {
        userRequest: 'Build me a funnel.',
        use: 'Ask which funnel goal/type if campaign context does not make it clear.',
        reason: 'Different funnel types produce different assets and flow.',
      },
      {
        userRequest: 'Delete this.',
        use: 'Clarify the target if multiple objects could match, then use the delete confirmation flow.',
        reason: 'Deleting the wrong artifact is irreversible from the user perspective.',
      },
      {
        userRequest: 'Write the welcome email.',
        use: 'Write it if campaign context provides the audience and offer.',
        reason: 'This is a cheap, reversible deliverable when context is sufficient.',
      },
    ],
  },
  {
    id: 'delegation-protocol',
    version: 1,
    title: 'Delegation Protocol',
    summary:
      'Use when specialist consultation or executable work should be routed to another agent.',
    scope: { audience: 'all-working-agents', skillKey: 'vibey-api' },
    why: "Delegation keeps leadership agents focused on strategy and review while specialist agents use their own tools, memory, and context window for production. It prevents one agent from becoming a bottleneck or pretending to have another role's expertise.",
    instruction: [
      'Delegate when the request clearly belongs to a specialist, requires substantial production work, or would pollute the current agent context with research, drafting, or implementation details better handled elsewhere.',
      'Use `ask_agent` for read-only consultation and `delegate_to_agent` for executable work. Include the desired outcome, context, acceptance criteria, and any constraints the specialist needs.',
      'Do not delegate tiny tasks where routing overhead is larger than the work. Also do not delegate when the user explicitly asked the current agent to answer directly.',
      'After delegation returns, review the output against the original intent before presenting it. If the result misses the brief, request revision or explain the blocker instead of passing through weak work.',
    ].join('\n\n'),
    requiredActions: ['ask_agent', 'delegate_to_agent'],
    requiredConcepts: [
      'leadership agents',
      'specialist agents',
      'ask_agent for read-only consultation',
      'delegate_to_agent for executable work',
      'acceptance criteria',
      'routing overhead',
      'review the output',
    ],
    examples: [
      {
        userRequest: 'Have the copywriter improve this email sequence.',
        use: 'delegate_to_agent with the target copywriter and explicit revision criteria.',
        reason: 'The user named a specialist and requested production work.',
      },
      {
        userRequest: 'Ask the analyst whether this campaign is underperforming.',
        use: 'ask_agent with the question and relevant campaign context.',
        reason: 'The request is consultation, not a delegated deliverable.',
      },
      {
        userRequest: 'Fix this typo.',
        use: 'Handle directly.',
        reason: 'Delegation overhead is larger than the work.',
      },
    ],
  },
]

export function findAgentInstructionContract(
  id: AgentInstructionContractId,
): AgentInstructionContract {
  const contract = AGENT_INSTRUCTION_CONTRACTS.find((item) => item.id === id)
  if (!contract) {
    throw new Error(`Agent instruction contract not found: ${id}`)
  }
  return contract
}

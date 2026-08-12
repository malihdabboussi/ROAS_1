import { filterPromptModeActiveActions } from '@vibey/agent-policy'
import {
  ACTION_SCHEMAS,
  describeActionContract,
} from '../../artifacts/services/artifact-action-schemas'
import { formatActionSkillLinks } from '../contracts/agent-action-skill-links'
import {
  getAgentInstructionContractReferencePath,
  getAgentInstructionContractsForSkill,
  renderAgentInstructionContract,
  renderAgentInstructionContractIndexForSkill,
} from '../contracts/agent-instruction-contracts'
import { VIBEY_API_ACTION_DOCS } from '../data/vibey-api-action-docs'

export type GeneratedSkillOutput = {
  skillMd: string
  referenceFiles: Record<string, string>
}

type ActionReference = { name: string; description: string; examples: string[] }

export type SkillGeneratorDomain =
  | 'marketing'
  | 'developer'
  | 'analyst'
  | 'operations'
  | 'support'
  | 'brain'
  | 'flows'
  | 'management'

/**
 * ask_clarification executes locally inside the vibey-backend plugin, so it is
 * never part of the policy-derived allowlist — the plugin always exposes it on
 * the tool schema (see docker/tools/vibey-backend withPluginLocalActions).
 * Document it for every conversational domain; Loop Flow builders must use
 * create_flow_clarification instead, so the flows domain stays clean.
 */
const PLUGIN_LOCAL_DOCUMENTED_ACTIONS = ['ask_clarification'] as const

function fallbackDoc(action: string): { section: string; description: string; parameters: string } {
  return {
    section: 'General',
    description: `Executes the "${action}" vibey backend action.`,
    parameters: `\`\`\`json\n{"action":"${action}","label":"Running ${action.replace(/_/g, ' ')}","data":{}}\n\`\`\``,
  }
}

function extractExamples(parameters: string): string[] {
  const results: string[] = []
  const regex = /```json\n([\s\S]*?)```/g
  let match
  while ((match = regex.exec(parameters)) !== null) {
    results.push(match[1].trim())
  }
  return results.length > 0 ? results : [parameters.trim()]
}

function toSlug(section: string): string {
  return section.toLowerCase().replace(/\s+/g, '-')
}

const PRESENTATION_ACTION_ORDER = [
  'create_presentation',
  'update_presentation',
  'get_presentation',
  'list_presentations',
  'list_presentation_files',
  'read_presentation_file',
  'show_presentation_file',
  'write_presentation_file',
  'patch_presentation_file',
  'delete_presentation_file',
  'list_presentation_assets',
  'attach_presentation_asset',
  'detach_presentation_asset',
  'apply_presentation_element_edit',
  'add_presentation_anchor',
  'extract_presentation_tweaks',
  'update_presentation_tweaks',
  'patch_presentation',
  'update_presentation_slide',
  'add_presentation_slide',
  'delete_presentation',
]

const PRESENTATION_ACTION_RANK = new Map(
  PRESENTATION_ACTION_ORDER.map((action, index) => [action, index]),
)

function sortActionsForSection(section: string, actions: ActionReference[]): ActionReference[] {
  return [...actions].sort((a, b) => {
    if (section === 'Presentations') {
      const aRank = PRESENTATION_ACTION_RANK.get(a.name) ?? Number.MAX_SAFE_INTEGER
      const bRank = PRESENTATION_ACTION_RANK.get(b.name) ?? Number.MAX_SAFE_INTEGER
      if (aRank !== bRank) return aRank - bRank
    }
    return a.name.localeCompare(b.name)
  })
}

function buildImportantPatterns(sections: Set<string>, availableActions: Set<string>): string {
  const patterns: string[] = []
  const protocolIndex = renderAgentInstructionContractIndexForSkill('vibey-api', availableActions)
  const documentRetrievalActions = [
    'search_conversations',
    'search_space_context',
    'list_documents',
    'get_document',
    'read_space_document',
    'read_document',
  ].filter((action) => availableActions.has(action))

  if (sections.has('Ads')) {
    patterns.push(
      `**Ad updates vs creation**: \`create_ad\` makes a new artifact. When the user asks to change, regenerate, or remake an existing ad, use \`update_ad\` with the ad_id. For image regeneration: \`generate_image\` first, then \`update_ad\` with the returned image_url and image_asset_id.`,
    )
  }

  if (sections.has('Funnels') || sections.has('Presentations') || sections.has('Ads')) {
    patterns.push(
      `**Theme auto-resolution**: \`create_funnel\`, \`create_presentation\`, and \`create_ad\` automatically pull the campaign's theme. Pass explicit \`theme_id\` only when overriding. Don't invent fallback colors/fonts when a campaign theme exists.`,
    )
  }
  if (sections.has('Media') || sections.has('Ads')) {
    patterns.push(
      `**Branding before creatives**: Read \`ACTIVE_THEME\` / \`BRANDING_GATE\` in campaign context before \`generate_image\`, \`create_ad\`, or branded \`process_media\` creatives. If Theme is none/unavailable, ask whether branding exists (or offer to pull/create a Theme) and wait — do not invent brand colors, logos, or style. If a Theme is present, confirm it is the right branding on the first branded visual in the conversation, then use that Theme for every subsequent image/creative.`,
    )
  }

  if (sections.has('Funnels') || sections.has('Website')) {
    patterns.push(
      `**Funnels are HTML bundles**: New funnel and website pages use \`files\` on \`add_funnel_page\`/\`add_website_page\` with \`index.html\` as the entry file (plain HTML, no TSX). Use \`read_funnel_file\`, \`write_funnel_file\`, or \`patch_funnel_file\` for targeted edits, \`attach_funnel_asset\` for uploaded images/fonts, and funnel-shared files (\`shared/styles.css\`, \`shared/nav.html\`, \`shared/footer.html\`) for cross-page styling and layout. Keep \`data-vibey-capture\` lead forms and \`data-vibey-link\`/\`data-next-page\` navigation attributes intact — the public runtime depends on them.`,
    )
  }

  if (sections.has('Forms')) {
    patterns.push(
      `**Forms are native artifacts**: Use \`create_form\`/\`update_form\` with \`schema.questions\` for fields and \`settings\` or \`settings_patch\` for colors, redirects, target Space, assignee, CAPTCHA, and branding. When the user uploads an image for a form, prefer \`attach_form_asset\` with semantic \`placement\` (\`cover\`, \`icon\`, or \`end_page_icon\`) instead of manually writing image settings. Do not create form HTML bundles when the user asks for a Vibey Form.`,
    )
  }

  if (sections.has('Presentations')) {
    patterns.push(
      `**Presentations are fixed-stage HTML bundles**: New presentations use \`source_mode: "html_bundle"\` with \`index.html\` as the entry file. Use \`files\` on \`create_presentation\` for one complete deck, then use \`read_presentation_file\`, \`write_presentation_file\`, or \`patch_presentation_file\` for targeted edits. Author every slide on a fixed \`1280x720\` stage; do not use \`min-height: 100vh\`, \`auto-fit\` slide grids, or viewport-scaled type. Use \`attach_presentation_asset\` for uploaded images/fonts referenced by bundle-relative paths.`,
    )
    patterns.push(
      `**Presentation craft vs contract**: For deck structure, composition, theme-native styling, and slide quality, read \`skills/presentation-builder/SKILL.md\`. Use \`vibey-api\` only to verify exact backend payload contracts. Mark new deck documents with \`data-vibey-theme-native="true"\` and use Theme tokens (\`var(--color-*)\`, \`var(--font-*)\`, \`var(--design-*)\`, spacing, typography) instead of hardcoded brand colors, fonts, radii, or shadows.`,
    )
  }

  if (sections.has('Themes')) {
    patterns.push(
      `**Themes**: \`get_theme\` returns flat fields (colors, font_heading, font_body, brand_voice, brand_values, design_settings, …). \`update_theme\` accepts the same keys for partial updates. \`extract_website_theme\` returns site-derived tokens — map them into those flat keys before \`create_theme\` or \`update_theme\`; do not use a single config blob.`,
    )
  }

  if (sections.has('Documents')) {
    if (documentRetrievalActions.length > 0) {
      patterns.push(
        `**Document retrieval before Brain**: Treat uploaded files, generated documents, attachments, reports, spreadsheets, PDFs, and user-provided datasets as active Space evidence first because they usually have exact retrievable source objects. Use ${documentRetrievalActions.map((action) => `\`${action}\``).join(', ')} before Brain when the user refers to a file, upload, report, attachment, or data they already gave. Use Brain for durable remembered facts, preferences, or cross-Space knowledge when no current document source is expected. Example: "I already gave you the April follow-up call data" means search Space/docs first; "What does Brian usually care about in reports?" can use Brain if no document is the obvious source.`,
      )
    }
    patterns.push(
      `**Document file formats**: \`create_pdf\` and \`create_docx\` default to markdown rendering. Set \`content_format: "html"\` when content contains HTML tags, otherwise tags print as raw text.`,
    )
  }

  if (sections.has('Tasks')) {
    patterns.push(
      `**Space retrieval protocol**: for browse/count/selection requests, discover the live space schema/view first, then call a filtered list action. Use \`get_space\` or \`list_space_views\` to identify status option ids, view ids, and custom field ids; then call \`list_tasks\`, \`list_documents\`, or \`list_space_view_items\` with filters, \`fields: "summary"\`, a small \`limit\`, and \`include_count: true\` when the user asks for counts. Do not list hundreds of rows and filter them yourself.`,
    )
    patterns.push(
      `**My Tasks means assigned to the current human user**: for "my tasks", "tasks assigned to me", or "their tasks" when "their" means the current user, call \`list_tasks\` with \`assigned_to_me: true\`. Do not use \`assignee_type: "unassigned"\`, and do not ask for or pass \`user_id\`; the backend resolves the current user from the session and matches multi-assignee rows the same way Home > My Tasks does.`,
    )
    patterns.push(
      `**create_task auto-ensures a space**: when the user asks for a task and you don't know which space, just call \`create_task\` with \`title\` (and optional priority/due_date/etc.) — the handler resolves a campaign-scoped or general space with a list/board/calendar view, or creates a default "Campaign Tasks" / "My Tasks" space. The response always includes the resolved \`space_id\` and an \`ensured_space\` flag. Do NOT ask the user which space to use just because \`list_spaces\` is empty.`,
    )
    patterns.push(
      `**New tasks stay open**: omit \`status\` when creating a new task unless the user explicitly named an open status. The backend defaults to the space's open/not-started status. Never create a task as completed/done/closed; if the user explicitly asked to mark it complete, create the task first, then use \`update_task\` with the completed status.`,
    )
    patterns.push(
      `**Tasks schema is user-defined**: status, priority, tags, and custom fields are configurable per space. Run \`get_space\` against the resolved \`space_id\` before sending status / priority / tag option ids — using a hardcoded value like "todo" will fail when the user has renamed it. The error response lists valid options.`,
    )
    patterns.push(
      `**Reserved keys vs. custom_data**: top-level keys on the payload (status, priority, assignee_type, assignee_id, start_date, due_date, description, notes, parent_item_id, sort_order, recurrence) map to dedicated columns. Everything else — including tags — goes inside \`custom_data\`, keyed by the schema field id. \`system: true\` in the schema means the user can't delete that field; it does not mean it has its own column.`,
    )
    patterns.push(
      `**custom_data is shallow-merged**: \`update_task\` only replaces the keys you send; other custom_data keys are preserved. Arrays (like tags) are replaced wholesale, not appended — to add one tag, run \`get_task\` first, then send \`custom_data: { tags: [...existing, "new"] }\`. Send \`custom_data: { someKey: null }\` to clear a field.`,
    )
  }

  if (
    availableActions.has('list_calendar_events') ||
    availableActions.has('create_calendar_event') ||
    availableActions.has('update_calendar_event') ||
    availableActions.has('delete_calendar_event')
  ) {
    patterns.push(
      `**Calendar events vs tasks**: Google Calendar and Outlook events are provider-owned integration records. Use \`list_calendar_events\`, \`create_calendar_event\`, \`update_calendar_event\`, and \`delete_calendar_event\` for connected calendar events. Use \`create_task\` or \`update_task\` with \`start_date\` and \`due_date\` when the user wants a Space task shown on the calendar. Calendar writes are for timed events only in v1; all-day provider events can be listed but should not be edited unless the backend contract adds all-day write support.`,
    )
    patterns.push(
      `**Calendar account identity**: \`list_calendar_events\` returns connected accounts. When more than one connected calendar account exists, resolve the user's requested account to its exact \`user_integration_id\` before calling \`create_calendar_event\`; if "personal", "work", or another label is still ambiguous, ask before writing. After creation, report the exact account label returned by the mutation receipt. Never guess which email/calendar was used and never tell the user to inspect their calendars to discover where the write landed.`,
    )
  }

  if (
    availableActions.has('list_campaigns') &&
    availableActions.has('get_campaign_main_dashboard')
  ) {
    patterns.push(
      `**Organization-wide campaign questions**: interpret plural, portfolio, client-wide, or "any campaigns" performance questions as organization scope, not the active or most recent campaign. Call \`list_campaigns\` with \`mode: "accessible"\`, exclude personal/general/system containers and inactive campaigns, then call \`get_campaign_main_dashboard\` for the eligible campaigns. Rank warning/critical alerts and separate missing or partial data from actual KPI failures. Drill only the flagged campaigns with provider-specific actions such as \`get_meta_ads_insights\`. Never present one campaign as the organization-wide answer unless the user explicitly narrowed the scope.`,
    )
  }

  if (sections.has('Flows')) {
    patterns.push(
      `**Flow action surface**: Flow Builder actions are backend actions. Call them through the backend action tool exposed by the runtime: \`vibey_backend\` in local/tool docs, or \`campaign_capability\` when OpenClaw surfaces the same tool in platform mode. The \`action\`, \`label\`, and \`data\` payload shape is identical.`,
    )
    patterns.push(
      `**Loop build order**: start with \`get_flow_build_context\`, search bounded capabilities with \`search_flow_capabilities\`, inspect exact contracts with \`get_flow_capability\`, clarify first with \`create_flow_clarification\` when human choices are missing, create or update a plan only after clarification is resolved, validate it, compile it to a disabled draft, evaluate non-trivial builds, and publish only after draft validation succeeds.`,
    )
    patterns.push(
      `**Workflow capability graph**: \`get_flow_build_context\` returns \`workflow_capabilities\`. Compile-ready Flow steps use \`trigger.*\` or \`action.*\` ids with \`execution.executor:"space_automation"\`. Broader platform candidates use \`agent_action.*\`; treat those as blueprint/runtime-bridge candidates and do not compile them directly unless an active blueprint or Flow runtime bridge exists.`,
    )
    patterns.push(
      `**Webhook Flow triggers**: first-party inbound webhook triggers use \`trigger.webhook_received\` with \`webhook_endpoint_id\`. Resolve or clarify the endpoint by label; never ask for a raw UUID in chat. Webhook payload templates use \`{{trigger.payload}}\`, mapped fields use \`{{trigger.fields.customer_email}}\`, and metadata uses \`{{trigger.webhook.event_id}}\` / \`{{trigger.webhook.received_at}}\`. Publishing webhook-triggered drafts must run through the Flows UI/API so endpoint validation runs.`,
    )
    patterns.push(
      `**Flow clarifications are pre-plan**: when a required flow choice cannot be resolved from context, call \`create_flow_clarification\` with card-shaped questions before planning. Do not put question fields on \`create_flow_plan\`, and do not use generic clarification actions for Loop Flow builds.`,
    )
    patterns.push(
      `**Server-owned Flow session**: in \`/flows\`, omit \`session_id\` on continuation actions. The backend attaches the active build session for \`update_flow_plan\`, \`answer_flow_clarification\`, \`validate_flow_plan\`, \`compile_flow_plan\`, and \`evaluate_flow_plan\`.`,
    )
  }

  if (availableActions.has('ask_clarification')) {
    patterns.push(
      `**Clarify ambiguous requests with a card**: when a request has multiple materially different interpretations and picking wrong wastes real work, call \`ask_clarification\` (1-3 focused questions, 2-5 options each, \`single_choice\` or \`multiple_choice\`). In studio chat it renders a tappable card and the user's picks come back as the next message. On Slack/Telegram do not use it — ask as plain numbered text. For Loop Flow builds use \`create_flow_clarification\` instead.`,
    )
  }

  patterns.push(
    `**Campaign context**: tool calls inherit the user's current \`space_id\` and \`campaign_id\` for campaign-scoped actions. Do not invent conversation_id or user_id. Exception — \`search_campaign_brain\`: when the chat is on General or the wrong campaign, pass \`campaign_id\` or \`campaign_name\` for the client campaign (e.g. Impact). General has no client package brain.`,
  )
  patterns.push(
    `**Active scope contract**: tool calls inherit the user's current \`space_id\` and \`campaign_id\` automatically for each message. Do not pass \`space_id\` or \`campaign_id\` unless targeting a different space/campaign (allowed for \`search_campaign_brain\` and other read-only cross-scope actions). If you target a different write scope, also pass \`scope_override: true\`.`,
  )

  patterns.push(
    `**Deletions**: All \`delete_*\` actions return a confirmation card. The user must approve before the delete executes.`,
  )

  const localPatterns = patterns.map((p) => `- ${p}`).join('\n')
  return [protocolIndex, localPatterns].filter(Boolean).join('\n\n')
}

function buildQuickStartExamples(
  domain: SkillGeneratorDomain,
  availableActions: Set<string>,
): string {
  const examples: string[] = []

  if (domain === 'developer') {
    if (availableActions.has('create_project')) {
      examples.push(`Create a project:
\`\`\`json
{ "action": "create_project", "label": "Setting up your project", "data": { "name": "My App", "framework": "next" } }
\`\`\``)
    }
  } else if (domain === 'analyst') {
    if (availableActions.has('get_meta_ads_insights')) {
      examples.push(`Get ad performance:
\`\`\`json
{ "action": "get_meta_ads_insights", "label": "Pulling your ad metrics", "data": { "campaign_id": "ROAS_CAMPAIGN_UUID", "level": "campaign", "date_preset": "last_7d" } }
\`\`\``)
    }
    if (availableActions.has('list_campaigns')) {
      examples.push(`List campaigns:
\`\`\`json
{ "action": "list_campaigns", "label": "Loading your campaigns", "data": {} }
\`\`\``)
    }
  } else if (domain === 'brain') {
    if (availableActions.has('save_user_memory')) {
      examples.push(`Save a memory (user brain only):
\`\`\`json
{ "action": "save_user_memory", "label": "Saving to your brain", "data": { "content": "Key insight about the customer", "memory_type": "insight", "significance": 0.8, "tags": ["customer"] } }
\`\`\``)
    }
    if (availableActions.has('ingest_agent_brain_text')) {
      examples.push(`Ingest agent brain knowledge (requires brain_id from resolve_agent_brain):
\`\`\`json
{ "action": "ingest_agent_brain_text", "label": "Adding knowledge", "data": { "brain_id": "UUID", "text": "Content to learn...", "sourceType": "document", "title": "Source Name" } }
\`\`\``)
    }
    if (availableActions.has('save_customer_memory')) {
      examples.push(`Save customer memory (contact_id preferred; use source identity when contact is unknown):
\`\`\`json
{ "action": "save_customer_memory", "label": "Saving customer insight", "data": { "content": "Customer wants weekly rollout summaries.", "memory_type": "preference", "contact_id": "UUID" } }
\`\`\`
Contactless source-anchored customer signal:
\`\`\`json
{ "action": "save_customer_memory", "label": "Saving customer signal", "data": { "content": "Public widget visitor wants weekly rollout summaries.", "memory_type": "insight", "source_type": "widget_chat", "conversation_id": "UUID", "visitor_id": "visitor_123" } }
\`\`\``)
    }
  } else if (domain === 'flows' || availableActions.has('create_flow_plan')) {
    if (availableActions.has('get_flow_build_context')) {
      examples.push(`Load Flow build context:
\`\`\`json
{ "action": "get_flow_build_context", "label": "Loading Flow context", "data": { "space_id": "ACTIVE_SPACE_ID_FROM_CONTEXT" } }
\`\`\``)
    }
    if (availableActions.has('search_flow_capabilities')) {
      examples.push(`Search premade Flow capabilities:
\`\`\`json
{ "action": "search_flow_capabilities", "label": "Finding Flow capabilities", "data": { "space_id": "ACTIVE_SPACE_ID_FROM_CONTEXT", "query": "task status changed", "kind": "trigger", "limit": 10 } }
\`\`\``)
    }
    if (availableActions.has('create_flow_clarification')) {
      examples.push(`Ask Flow clarification before planning:
\`\`\`json
{ "action": "create_flow_clarification", "label": "Clarifying Flow choices", "data": { "space_id": "ACTIVE_SPACE_ID_FROM_CONTEXT", "title": "A few Flow choices", "questions": [{ "id": "next_step_rule", "text": "How should Loop detect that a task has no next step?", "type": "single_choice", "options": [{ "id": "no_linked_tasks", "label": "No linked tasks" }, { "id": "empty_next_step_field", "label": "Empty Next Step field" }], "required": true }] } }
\`\`\``)
    }
    if (availableActions.has('create_flow_plan')) {
      examples.push(`Create a Flow plan after clarification:
\`\`\`json
{ "action": "create_flow_plan", "label": "Drafting Flow plan", "data": { "space_id": "ACTIVE_SPACE_ID_FROM_CONTEXT", "intent": "When a task moves to Done, summarize the outcome and create follow-up work when no next step exists.", "name": "Done task follow-up", "trigger": { "type": "status_change", "to": "done" }, "actions": [{ "type": "add_comment", "message_template": "Summary: {{summary}}" }] } }
\`\`\``)
    }
  } else {
    if (availableActions.has('create_funnel')) {
      examples.push(`Create a funnel:
\`\`\`json
{ "action": "create_funnel", "label": "Setting up your funnel", "data": { "name": "Lead Magnet Funnel", "slug": "lead-magnet", "funnel_type": "lead-magnet" } }
\`\`\``)
    }
    if (availableActions.has('create_form')) {
      examples.push(`Create a native form:
\`\`\`json
{ "action": "create_form", "label": "Building your form", "data": { "name": "Client Intake", "schema": { "title": "Client Intake", "questions": [{ "id": "name", "type": "short_text", "label": "Name", "required": true }] }, "settings": { "button_label": "Submit", "cover_url": "https://example.com/cover.png" } } }
\`\`\``)
    }
    if (availableActions.has('attach_form_asset')) {
      examples.push(`Attach an uploaded image to a native form:
\`\`\`json
{ "action": "attach_form_asset", "label": "Adding image to your form", "data": { "form_id": "UUID", "placement": "cover", "focal_y": 45 } }
\`\`\``)
    }
    if (availableActions.has('create_offer')) {
      examples.push(`Create an offer:
\`\`\`json
{ "action": "create_offer", "label": "Crafting your offer", "data": { "name": "Premium Coaching Package" } }
\`\`\``)
    }
    if (availableActions.has('create_ad')) {
      examples.push(`Create an ad:
\`\`\`json
{ "action": "create_ad", "label": "Crafting your ad", "data": { "platform": "meta", "placement": "feed", "primary_text": "...", "headline": "...", "destination_url": "https://..." } }
\`\`\``)
    }
  }

  if (availableActions.has('ask_agent')) {
    examples.push(`Ask another agent (requires target_agent_key + prompt):
\`\`\`json
{ "action": "ask_agent", "label": "Consulting with Ivy", "data": { "target_agent_key": "copywriter", "prompt": "Review this headline and suggest improvements" } }
\`\`\``)
  }
  if (availableActions.has('delegate_to_agent')) {
    examples.push(`Delegate a task to another agent (requires target_agent_key + task_description):
\`\`\`json
{ "action": "delegate_to_agent", "label": "Delegating to Rex", "data": { "target_agent_key": "developer", "task_description": "Build a responsive landing page for the Q2 launch" } }
\`\`\``)
  }
  if (availableActions.has('brainstorm_agents')) {
    examples.push(`Start a multi-agent brainstorm (requires agents array + topic + rounds):
\`\`\`json
{ "action": "brainstorm_agents", "label": "Brainstorming Q3 positioning", "data": { "agents": ["niko", "ivy", "lux"], "topic": "Q3 product positioning strategy for enterprise", "rounds": 2 } }
\`\`\``)
  }

  if (availableActions.has('create_task')) {
    examples.push(`Add a task to a space:
\`\`\`json
{ "action": "create_task", "label": "Adding task", "data": { "space_id": "UUID", "title": "Follow up with Sarah", "due_date": "2026-05-15T12:00:00Z", "custom_data": { "tags": ["follow-up"] } } }
\`\`\``)
  }

  if (availableActions.has('list_calendar_events')) {
    examples.push(`List connected calendar events:
\`\`\`json
{ "action": "list_calendar_events", "label": "Checking calendar", "data": { "start": "2026-06-18T00:00:00.000Z", "end": "2026-06-19T00:00:00.000Z", "timezone": "Asia/Nicosia" } }
\`\`\``)
  }

  if (availableActions.has('create_calendar_event')) {
    examples.push(`Create a provider calendar event:
\`\`\`json
{ "action": "create_calendar_event", "label": "Adding calendar event", "data": { "provider": "google_calendar", "user_integration_id": "UUID_FROM_LIST_CALENDAR_EVENTS", "title": "Review launch tasks", "start": "2026-06-18T10:00:00.000Z", "end": "2026-06-18T10:30:00.000Z", "timezone": "Asia/Nicosia" } }
\`\`\``)
  }

  if (examples.length === 0 && availableActions.has('save_user_memory')) {
    examples.push(`Save a memory:
\`\`\`json
{ "action": "save_user_memory", "label": "Saving to your brain", "data": { "content": "Key insight", "memory_type": "insight", "significance": 0.8 } }
\`\`\``)
  }

  return examples.join('\n\n')
}

function buildReferenceMarkdown(section: string, actions: ActionReference[]): string {
  const lines: string[] = [`# ${section}`, '', ...buildReferenceSectionContract(section)]

  for (const action of actions) {
    lines.push(`## ${action.name}`)
    const schema = ACTION_SCHEMAS[action.name]
    if (schema?.required.length) {
      lines.push(`**Required keys:** ${schema.required.map((k) => `\`${k}\``).join(', ')}`)
      lines.push('')
    }
    if (schema?.optional?.length) {
      lines.push(`**Optional keys:** ${schema.optional.map((k) => `\`${k}\``).join(', ')}`)
      lines.push('')
    }
    const contract = describeActionContract(action.name)
    const aliases = contract?.aliases as Record<string, string> | undefined
    if (aliases && Object.keys(aliases).length > 0) {
      lines.push(
        `**Aliases:** ${Object.entries(aliases)
          .map(([from, to]) => `\`${from}\` → \`${to}\``)
          .join(', ')}`,
      )
      lines.push('')
    }
    const types = contract?.types as Record<string, string> | undefined
    if (types && Object.keys(types).length > 0) {
      lines.push(
        `**Types:** ${Object.entries(types)
          .map(([key, type]) => `\`${key}\`: ${type}`)
          .join(', ')}`,
      )
      lines.push('')
    }
    const useWhen = contract?.use_when as string[] | undefined
    if (useWhen?.length) {
      lines.push(`**Use when:** ${useWhen.join(' ')}`)
      lines.push('')
    }
    const doNotUseWhen = contract?.do_not_use_when as string[] | undefined
    if (doNotUseWhen?.length) {
      lines.push(`**Do not use when:** ${doNotUseWhen.join(' ')}`)
      lines.push('')
    }
    const skillLinks = formatActionSkillLinks(action.name)
    for (const skillLink of skillLinks) {
      lines.push(skillLink)
    }
    if (skillLinks.length > 0) {
      lines.push('')
    }
    lines.push(action.description)
    lines.push('')
    for (const example of action.examples) {
      lines.push('```json')
      lines.push(example)
      lines.push('```')
      lines.push('')
    }
    const contractExamples = contract?.examples as
      | Array<{ intent: string; data: Record<string, unknown> }>
      | undefined
    for (const example of contractExamples ?? []) {
      lines.push(`Contract example: ${example.intent}`)
      lines.push('```json')
      lines.push(JSON.stringify({ action: action.name, label: example.intent, data: example.data }))
      lines.push('```')
      lines.push('')
    }
  }

  return lines.join('\n')
}

function buildReferenceSectionContract(section: string): string[] {
  if (section !== 'Presentations') return []

  return [
    '## Section Contract',
    '',
    '- New presentations use `create_presentation` with `source_mode: "html_bundle"`, `entry_file: "index.html"`, and a complete `files` bundle.',
    '- Author slides as fixed `1280x720` stages. Do not use `min-height: 100vh`, `auto-fit` slide grids, or viewport-scaled type for slide composition.',
    '- Use `skills/presentation-builder/SKILL.md` for deck structure and visual quality. Use this file only for exact backend payload contracts.',
    '- Legacy slide/TSX actions (`patch_presentation`, `update_presentation_slide`, `add_presentation_slide`) are only for older `generated_html` presentations. Never use them for new decks.',
    '',
  ]
}

function buildProtocolReferenceFiles(availableActions: Set<string>): Record<string, string> {
  const referenceFiles: Record<string, string> = {}
  for (const contract of getAgentInstructionContractsForSkill('vibey-api', availableActions)) {
    referenceFiles[getAgentInstructionContractReferencePath(contract)] = [
      '# Platform Protocol',
      '',
      renderAgentInstructionContract(contract),
      '',
    ].join('\n')
  }
  return referenceFiles
}

export function generateScopedVibeyApiSkill(
  allowedActions: Set<string>,
  domain: SkillGeneratorDomain = 'management',
): GeneratedSkillOutput {
  const activeAllowedActions = new Set(filterPromptModeActiveActions(allowedActions))
  const documentedActions = new Set(activeAllowedActions)
  if (domain !== 'flows') {
    for (const action of PLUGIN_LOCAL_DOCUMENTED_ACTIONS) {
      documentedActions.add(action)
    }
  }
  const sectionMap = new Map<string, ActionReference[]>()
  const sortedActions = [...documentedActions].sort((a, b) => a.localeCompare(b))

  for (const action of sortedActions) {
    const doc = VIBEY_API_ACTION_DOCS[action] ?? fallbackDoc(action)
    const bucket = sectionMap.get(doc.section) ?? []
    bucket.push({
      name: action,
      description: doc.description,
      examples: extractExamples(doc.parameters),
    })
    sectionMap.set(doc.section, bucket)
  }

  const activeSections = new Set(sectionMap.keys())
  const sortedSections = [...sectionMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([section, actions]) => [section, sortActionsForSection(section, actions)] as const)

  const indexRows = sortedSections.map(([section, actions]) => {
    const slug = toSlug(section)
    const names = actions.map((a) => `\`${a.name}\``).join(', ')
    return `| ${section} | \`references/${slug}.md\` | ${names} |`
  })

  const importantPatterns = buildImportantPatterns(activeSections, documentedActions)
  const quickStart = buildQuickStartExamples(domain, documentedActions)

  const skillMd = `---
name: vibey-api
description: Vibey backend actions for artifacts, Spaces, Brain, team, campaigns, and Flows. Read before calling vibey_backend or campaign_capability.
---

# Vibey API

\`\`\`
vibey_backend({ action: "ACTION_NAME", label: "UI label", data: { ... } })
\`\`\`

In platform mode, OpenClaw may surface this same backend action tool as \`campaign_capability\`. Use the tool name currently exposed by the runtime; the \`action\`, \`label\`, and \`data\` payload contract is the same.

Auth, active Space, campaign context, and routing are handled automatically.

Before calling a backend action, use the exact contract already in this skill, the current tool schema, or current context. Call \`describe_action\` only when the contract is not available or the required fields, optional fields, aliases, or action fit are still uncertain. Do not guess payload keys.

## Quick Start

${quickStart || '_No common examples available for your action set._'}

## Important Patterns

${importantPatterns || '_No platform protocols or patterns available for your action set._'}

## All Actions

Read the reference file for the section you need:

| Section | Reference File | Actions |
|---------|---------------|---------|
${indexRows.join('\n')}
`

  const referenceFiles: Record<string, string> = buildProtocolReferenceFiles(activeAllowedActions)
  for (const [section, actions] of sortedSections) {
    const slug = toSlug(section)
    referenceFiles[`references/${slug}.md`] = buildReferenceMarkdown(section, actions)
  }

  return { skillMd, referenceFiles }
}

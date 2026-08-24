import { describe, expect, it } from 'vitest'
import {
  AGENT_INSTRUCTION_CONTRACTS,
  findAgentInstructionContract,
  getAgentInstructionContractReferencePath,
  renderAgentInstructionContractIndexForSkill,
  renderAgentInstructionContractsForSkill,
} from './agent-instruction-contracts'

describe('agent instruction contracts', () => {
  it('defines platform-wide operating protocols for all working agents', () => {
    expect(AGENT_INSTRUCTION_CONTRACTS.map((contract) => contract.id)).toEqual([
      'space-retrieval-protocol',
      'space-schema-mutation-protocol',
      'brain-knowledge-protocol',
      'skill-usage-protocol',
      'tool-schema-protocol',
      'data-grounding-protocol',
      'flow-building-protocol',
      'planning-protocol',
      'persistence-protocol',
      'clarification-protocol',
      'delegation-protocol',
    ])

    for (const contract of AGENT_INSTRUCTION_CONTRACTS) {
      expect(contract.scope).toEqual({
        audience: 'all-working-agents',
        skillKey: 'vibey-api',
      })
      expect(contract.version).toBeGreaterThanOrEqual(1)
      expect(Number.isInteger(contract.version)).toBe(true)
      expect(contract.summary.length).toBeGreaterThan(40)
      expect(contract.why.length).toBeGreaterThan(80)
      expect(contract.instruction.length).toBeGreaterThan(300)
      expect(contract.examples.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('defines Space retrieval as semantic, query, and exact object modes', () => {
    const contract = findAgentInstructionContract('space-retrieval-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual(['search_space_context'])
    expect(text).toContain('embedded work context')
    expect(text).toContain('semantic mode')
    expect(text).toContain('query mode')
    expect(text).toContain('exact mode')
    expect(text).toContain('semantic Space retrieval')
    expect(text).toContain('retrieve_via')
    expect(text).toContain('query first and inspect second')
    expect(text).toContain('schema.fields')
    expect(text).toContain('status option ids')
    expect(text).toContain('custom field ids')
    expect(text).toContain('fields summary')
    expect(text).toContain('include_count')
    expect(text).toContain('filters object for custom_data keys')
    expect(text).toContain('exact get/read action when object is identified')
    expect(contract.examples.map((example) => example.use).join('\n')).toContain('list_tasks')
    expect(contract.examples.map((example) => example.use).join('\n')).toContain('get_task')
  })

  it('defines Space schema mutation as visible field and option alignment', () => {
    const contract = findAgentInstructionContract('space-schema-mutation-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')
    const examples = contract.examples.map((example) => example.use).join('\n')

    expect(contract.version).toBe(2)
    expect(contract.requiredActions).toEqual([
      'get_space',
      'create_space_field',
      'update_space_field',
      'append_space_field_option',
      'create_space_status',
      'create_space_category',
      'create_space_tag',
      'create_space_view',
      'update_space_view',
    ])
    expect(text).toContain('schema alignment before Flow planning')
    expect(text).toContain('status options on the system status field')
    expect(text).toContain('append-only option helper')
    expect(text).toContain('Adding a status is a `create_space_status` call')
    expect(text).toContain('not `create_space_field`')
    expect(examples).toContain('create_space_status')
  })

  it('defines Brain knowledge as family-specific durable memory retrieval', () => {
    const contract = findAgentInstructionContract('brain-knowledge-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual([
      'search_user_brain',
      'synthesize_user_brain_topic',
      'search_company_brain',
      'resolve_agent_brain',
      'search_agent_brain',
      'search_customer_brain',
      'search_brain_context',
      'get_brain_pages',
    ])
    expect(text).toContain('durable knowledge')
    expect(text).toContain('most specific Brain family first')
    expect(text).toContain('cross-Brain search only for multiple/all brains')
    expect(text).toContain('curated knowledge pages')
    expect(text).toContain('context is insufficient')
    expect(text).toContain('zero-result semantic search is not proof of absence')
    expect(text).toContain('first-person fill')
    expect(text).toContain('do not send that work to Atlas')
    expect(contract.examples.map((example) => example.userRequest).join('\n')).toContain(
      'help me fill this out',
    )
  })

  it('defines Skill usage as workflow guidance layered over action contracts', () => {
    const contract = findAgentInstructionContract('skill-usage-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual([])
    expect(text).toContain('SKILLS.md')
    expect(text).toContain('skills/{skill-key}/SKILL.md')
    expect(text).toContain('workflow skill')
    expect(text).toContain('vibey-api as action contract skill')
    expect(text).toContain('one relevant workflow skill')
  })

  it('defines Tool schema use as contract-first action execution', () => {
    const contract = findAgentInstructionContract('tool-schema-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual([])
    expect(text).toContain('exact schema')
    expect(text).toContain('snake_case keys')
    expect(text).toContain('useWhen')
    expect(text).toContain('doNotUseWhen')
    expect(text).toContain('schema preflight fails')
  })

  it('defines Data grounding as the canonical no-guessing protocol', () => {
    const contract = findAgentInstructionContract('data-grounding-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual([])
    expect(text).toContain('Do not guess when the platform can know')
    expect(text).toContain('data-driven')
    expect(text).toContain('source of truth')
    expect(text).toContain('retrieve or read')
    expect(text).toContain('schemas and contracts as constraints')
    expect(text).toContain('evidence is insufficient')
    expect(text).toContain('invented ids')
    expect(text).toContain('guessed field names')
    expect(text).toContain('low-impact assumptions')
  })

  it('defines Flow building as capability-first draft validation', () => {
    const contract = findAgentInstructionContract('flow-building-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual([
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
    ])
    expect(text).toContain('capability search first')
    expect(text).toContain('workflow_capabilities')
    expect(text).toContain('agent_action candidates need a runtime bridge')
    expect(text).toContain('schema alignment before planning')
    expect(text).toContain('Space Schema Mutation Protocol')
    expect(text).toContain('disabled drafts')
    expect(text).toContain('validate before publish')
    expect(text).toContain('webhook_received')
    expect(text).toContain('webhook_endpoint_id')
    expect(text).toContain('trigger.fields')
    expect(text).toContain('never invent unsupported actions')
  })

  it('defines Planning as a short route for multi-step or risky work', () => {
    const contract = findAgentInstructionContract('planning-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual([])
    expect(text).toContain('multiple dependent steps')
    expect(text).toContain('multiple skills')
    expect(text).toContain('expensive or irreversible work')
    expect(text).toContain('approval point')
    expect(text).toContain('update the plan when new evidence changes the path')
  })

  it('defines Persistence as saving work into durable platform state', () => {
    const contract = findAgentInstructionContract('persistence-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toContain('patch_state')
    expect(text).toContain('durable user assets')
    expect(text).toContain('canonical create/update action')
    expect(text).toContain('working state')
    expect(text).toContain('inherited runtime scope')
    expect(text).toContain('verify save responses')
  })

  it('defines Clarification as the guardrail for high-impact ambiguity', () => {
    const contract = findAgentInstructionContract('clarification-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual([])
    expect(text).toContain('required input is missing')
    expect(text).toContain('destructive')
    expect(text).toContain('publishes or sends')
    expect(text).toContain('retrieve first')
    expect(text).toContain('recommended default')
  })

  it('defines Delegation as specialist routing with review', () => {
    const contract = findAgentInstructionContract('delegation-protocol')
    const text = [contract.why, contract.instruction, ...contract.requiredConcepts].join('\n')

    expect(contract.requiredActions).toEqual(['ask_agent', 'delegate_to_agent'])
    expect(text).toContain('leadership agents')
    expect(text).toContain('specialist agents')
    expect(text).toContain('ask_agent for read-only consultation')
    expect(text).toContain('delegate_to_agent for executable work')
    expect(text).toContain('review the output')
  })

  it('renders only protocols whose required actions are available for vibey-api', () => {
    const rendered = renderAgentInstructionContractsForSkill(
      'vibey-api',
      new Set([
        'search_space_context',
        'get_space',
        'list_space_views',
        'list_space_view_items',
        'list_tasks',
        'search_user_brain',
        'synthesize_user_brain_topic',
        'search_company_brain',
        'resolve_agent_brain',
        'search_agent_brain',
        'search_customer_brain',
        'search_brain_context',
        'get_brain_pages',
        'patch_state',
        'ask_agent',
        'delegate_to_agent',
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
      ]),
    )

    expect(rendered).toContain('### Space Retrieval Protocol')
    expect(rendered).toContain('Protocol version: 1')
    expect(rendered).toContain('### Brain Knowledge Protocol')
    expect(rendered).toContain('### Skill Usage Protocol')
    expect(rendered).toContain('### Tool Schema Protocol')
    expect(rendered).toContain('### Data Grounding Protocol')
    expect(rendered).toContain('### Flow Building Protocol')
    expect(rendered).toContain('### Planning Protocol')
    expect(rendered).toContain('### Persistence Protocol')
    expect(rendered).toContain('### Clarification Protocol')
    expect(rendered).toContain('### Delegation Protocol')
    expect(rendered).toContain('Why:')
    expect(rendered).toContain('Examples:')
    expect(rendered).not.toContain('platform error')
  })

  it('omits unavailable action protocols while keeping actionless guidance', () => {
    const rendered = renderAgentInstructionContractsForSkill(
      'vibey-api',
      new Set(['search_space_context']),
    )

    expect(rendered).toContain('### Space Retrieval Protocol')
    expect(rendered).toContain('### Skill Usage Protocol')
    expect(rendered).toContain('### Tool Schema Protocol')
    expect(rendered).toContain('### Data Grounding Protocol')
    expect(rendered).toContain('### Planning Protocol')
    expect(rendered).toContain('### Clarification Protocol')
    expect(rendered).not.toContain('### Brain Knowledge Protocol')
    expect(rendered).not.toContain('### Delegation Protocol')
  })

  it('renders compact protocol index rows with reference paths', () => {
    const contract = findAgentInstructionContract('space-retrieval-protocol')
    const rendered = renderAgentInstructionContractIndexForSkill(
      'vibey-api',
      new Set(['search_space_context']),
    )

    expect(getAgentInstructionContractReferencePath(contract)).toBe(
      'references/protocols/space-retrieval-protocol.md',
    )
    expect(rendered).toContain('| Space Retrieval Protocol | v1 |')
    expect(rendered).toContain('`references/protocols/space-retrieval-protocol.md`')
    expect(rendered).toContain(contract.summary)
  })
})

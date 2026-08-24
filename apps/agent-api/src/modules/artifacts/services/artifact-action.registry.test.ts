import { describe, expect, it } from 'vitest'
import type { ChatScope } from '@vibey/api-shared'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import {
  ACTION_METHOD_MAP,
  getActionScopeMode,
  parseBrainOpsTargetBrainIdFromSessionKey,
  parseConversationIdFromSessionKey,
  parseDreamOpsSessionKey,
  validateScopeForAction,
  withBrainOpsActionDefaults,
  withFlowBuildDefaults,
  withScopeDefaults,
} from './artifact-action.registry'

const canonicalBrainActions = [
  'save_user_memory',
  'search_user_brain',
  'synthesize_user_brain_topic',
  'search_brain_context',
  'crystallize_user_brain',
  'ingest_user_brain_text',
  'ingest_user_brain_link',
  'ingest_user_brain_document',
  'assign_user_memory_source',
  'list_user_brain_memories',
  'resolve_agent_brain',
  'search_agent_brain',
  'ingest_agent_brain_text',
  'ingest_agent_brain_link',
  'list_agent_brain_domains',
  'get_agent_brain_gaps',
  'list_agent_brain_imports',
  'save_customer_memory',
  'search_customer_brain',
  'ingest_customer_brain_text',
  'ingest_customer_brain_link',
  'list_customer_brain_memories',
  'list_customer_avatars',
  'get_brain_pages',
  'create_brain_page',
  'patch_brain_page',
  'update_brain_page',
  'archive_brain_page',
  'link_brain_pages',
  'unlink_brain_pages',
  'get_brain_belief_patterns',
  'create_brain_belief_pattern',
  'update_brain_belief_pattern',
  'archive_brain_belief_pattern',
  'merge_brain_belief_patterns',
  'connect_brain_belief_to_memory',
  'disconnect_brain_belief_from_memory',
  'get_brain_perspectives',
  'create_brain_perspective',
  'update_brain_perspective',
  'archive_brain_perspective',
  'connect_brain_belief_to_perspective',
  'disconnect_brain_belief_from_perspective',
  'get_company_brain_objects',
  'get_company_brain_object_edges',
  'search_company_brain',
  'propose_company_brain_signal',
  'create_company_brain_object',
  'update_company_brain_object',
  'archive_company_brain_object',
  'create_company_brain_edge',
  'delete_company_brain_edge',
] as const

const removedBrainActions = [
  'save_memory',
  'search_memory',
  'trigger_crystallization',
  'ingest_brain_text',
  'ingest_brain_link',
  'ingest_user_document',
  'ingest_user_link',
  'search_sk_entries',
  'resolve_agent_sk_brain',
  'ingest_sk_text',
  'ingest_sk_link',
  'list_brain_domains',
  'get_brain_gaps',
  'list_brain_imports',
  'list_recent_memories',
  'search_campaign_knowledge',
  'ingest_campaign_file',
  'ingest_campaign_url',
  'get_company_cortex_objects',
  'get_company_cortex_object_edges',
  'search_company_cortex',
  'create_company_cortex_object',
  'update_company_cortex_object',
  'archive_company_cortex_object',
  'create_company_cortex_edge',
  'delete_company_cortex_edge',
  'get_narrative_pages',
  'create_narrative_page',
  'patch_narrative_page',
  'update_narrative_page',
  'archive_narrative_page',
  'link_narrative_pages',
  'unlink_narrative_pages',
  'get_belief_patterns',
  'create_belief_pattern',
  'update_belief_pattern',
  'archive_belief_pattern',
  'merge_belief_patterns',
  'connect_belief_to_memory',
  'disconnect_belief_from_memory',
  'get_perspectives',
  'create_perspective',
  'update_perspective',
  'archive_perspective',
  'connect_belief_to_perspective',
  'disconnect_belief_from_perspective',
] as const

const flowActions = [
  'search_flow_capabilities',
  'get_flow_capability',
  'list_flows',
  'get_flow',
  'create_flow_draft',
  'update_flow_draft',
  'validate_flow_draft',
  'publish_flow',
  'get_flow_build_context',
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
] as const

const spaceSchemaActions = [
  'create_space_field',
  'update_space_field',
  'append_space_field_option',
  'create_space_status',
  'create_space_category',
  'create_space_tag',
  'create_space_view',
  'update_space_view',
] as const
const spaceResearchActions = [
  'run_social_research_search',
  'run_ads_research_search',
  'search_ads_research_advertisers',
] as const
const dreamOpsActions = [
  'dream_inspect_agent',
  'dream_search_evidence',
  'dream_propose_skill_create',
  'dream_propose_skill_update',
  'dream_propose_skill_resource_update',
  'dream_propose_agent_file_update',
  'dream_route_out',
  'dream_finish',
] as const

const campaignScope: ChatScope = {
  space_id: '00000000-0000-0000-0000-000000000001',
  campaign_id: '00000000-0000-0000-0000-000000000002',
  scope_kind: 'campaign',
  org_id: null,
}

describe('artifact action scope helpers', () => {
  it('exposes canonical Brain action names only', () => {
    for (const action of canonicalBrainActions) {
      expect(ACTION_METHOD_MAP[action]).toBeDefined()
    }

    for (const action of removedBrainActions) {
      expect(ACTION_METHOD_MAP[action]).toBeUndefined()
    }
  })

  it('treats canonical Brain actions as global scope actions', () => {
    for (const action of canonicalBrainActions) {
      expect(getActionScopeMode(action)).toBe('global')
    }
  })

  it('keeps search_campaign_brain campaign-scoped (auto) so campaign_id injects', () => {
    expect(ACTION_METHOD_MAP.search_campaign_brain).toBe('searchCampaignBrain')
    expect(getActionScopeMode('search_campaign_brain')).toBe('auto')
  })

  it('maps every flow action to a handler method and keeps them active-scope aware', () => {
    for (const action of flowActions) {
      expect(ACTION_METHOD_MAP[action]).toBeDefined()
      expect(getActionScopeMode(action)).toBe('auto')
    }
  })

  it('maps Space schema actions to handler methods and keeps them active-scope aware', () => {
    for (const action of spaceSchemaActions) {
      expect(ACTION_METHOD_MAP[action]).toBeDefined()
      expect(getActionScopeMode(action)).toBe('auto')
    }
  })

  it('maps Space research actions to handler methods and keeps them active-scope aware', () => {
    for (const action of spaceResearchActions) {
      expect(ACTION_METHOD_MAP[action]).toBeDefined()
      expect(getActionScopeMode(action)).toBe('auto')
    }
  })

  it('maps Dream Ops actions to global internal handlers', () => {
    for (const action of dreamOpsActions) {
      expect(ACTION_METHOD_MAP[action]).toBeDefined()
      expect(getActionScopeMode(action)).toBe('global')
    }
  })

  it('parses a Dream Ops HR session key', () => {
    expect(
      parseDreamOpsSessionKey('agent:org-org-1-hr:dream_ops:hr:user-1:run-1::org:org-1'),
    ).toEqual({
      mode: 'dream_ops',
      agentKey: 'hr',
      userId: 'user-1',
      runId: 'run-1',
      orgId: 'org-1',
    })
  })

  it('parses the conversation id from a scoped session key', () => {
    expect(
      parseConversationIdFromSessionKey(
        'agent:vibey:vibey-00000000-0000-4000-8000-000000000003-00000000-0000-4000-8000-000000000004::campaign:00000000-0000-4000-8000-000000000002::space:00000000-0000-4000-8000-000000000001',
      ),
    ).toBe('00000000-0000-4000-8000-000000000004')
  })

  it('parses conversation id when gatewayAgentId embeds org UUID (matches[1] is not conversation)', () => {
    const org = '00000000-0000-4000-8000-0000000000aa'
    const user = '00000000-0000-4000-8000-000000000003'
    const conv = '00000000-0000-4000-8000-000000000004'
    const gid = `org-${org}-vibey`
    const key = `agent:${gid}:${gid}-${user}-${conv}::campaign:00000000-0000-4000-8000-000000000002::space:00000000-0000-4000-8000-000000000001`
    expect(parseConversationIdFromSessionKey(key)).toBe(conv)
  })

  it('parses conversation id from delegation session base (conversation before delegationId)', () => {
    const org = '00000000-0000-4000-8000-0000000000aa'
    const user = '00000000-0000-4000-8000-000000000003'
    const conv = '00000000-0000-4000-8000-000000000004'
    const deleg = '00000000-0000-4000-8000-000000000099'
    const gid = `org-${org}-vibey`
    const base = `agent:${gid}:delegation:caller:${user}:${conv}:${deleg}`
    expect(parseConversationIdFromSessionKey(`${base}::depth:1::chain:a`)).toBe(conv)
  })

  it('parses parent conversation id from AgentRuntimeService delegation keys', () => {
    const runtime = new AgentRuntimeService()
    const org = '00000000-0000-4000-8000-0000000000aa'
    const user = '00000000-0000-4000-8000-000000000003'
    const conv = '00000000-0000-4000-8000-000000000004'
    const deleg = '00000000-0000-4000-8000-000000000099'

    const key = runtime.buildDelegationSessionKey({
      targetAgentKey: 'designer',
      callerAgentKey: 'vibey',
      userId: user,
      conversationId: conv,
      delegationId: deleg,
      campaignId: campaignScope.campaign_id ?? undefined,
      spaceId: campaignScope.space_id ?? undefined,
      orgId: org,
      depth: 1,
      chain: ['vibey'],
    })

    expect(parseConversationIdFromSessionKey(key)).toBe(conv)
  })

  it('injects missing scope defaults and preserves explicit values', () => {
    expect(withScopeDefaults('create_task', { title: 'Follow up' }, campaignScope)).toMatchObject({
      title: 'Follow up',
      space_id: campaignScope.space_id,
      campaign_id: campaignScope.campaign_id,
    })
    expect(
      withScopeDefaults('search_space_context', { query: 'retainer guardrails' }, campaignScope),
    ).toMatchObject({
      query: 'retainer guardrails',
      space_id: campaignScope.space_id,
      campaign_id: campaignScope.campaign_id,
    })
    expect(
      withScopeDefaults(
        'create_task',
        { title: 'Follow up', space_id: '00000000-0000-0000-0000-000000000099' },
        campaignScope,
      ),
    ).toMatchObject({ space_id: '00000000-0000-0000-0000-000000000099' })
    expect(
      withScopeDefaults(
        'create_flow_draft',
        { name: 'Follow-up flow', trigger: { type: 'task_created' }, actions: [] },
        campaignScope,
      ),
    ).toMatchObject({
      name: 'Follow-up flow',
      space_id: campaignScope.space_id,
      campaign_id: campaignScope.campaign_id,
    })
    expect(
      withScopeDefaults(
        'append_space_field_option',
        { field_id: 'tags', label: 'Urgent' },
        campaignScope,
      ),
    ).toMatchObject({
      field_id: 'tags',
      label: 'Urgent',
      space_id: campaignScope.space_id,
      campaign_id: campaignScope.campaign_id,
    })
  })

  it('injects active flow build defaults for build continuation actions', () => {
    const activeBuild = {
      sessionId: '00000000-0000-4000-8000-000000000010',
      spaceId: campaignScope.space_id,
      targetAutomationId: '00000000-0000-4000-8000-000000000011',
    }

    expect(withFlowBuildDefaults('validate_flow_plan', {}, activeBuild)).toMatchObject({
      session_id: activeBuild.sessionId,
      space_id: activeBuild.spaceId,
      target_automation_id: activeBuild.targetAutomationId,
    })
    expect(
      withFlowBuildDefaults(
        'compile_flow_plan',
        { session_id: '00000000-0000-4000-8000-000000000099' },
        activeBuild,
      ),
    ).toMatchObject({
      session_id: '00000000-0000-4000-8000-000000000099',
      space_id: activeBuild.spaceId,
    })
  })

  it('does not inject active flow build defaults into new-plan actions', () => {
    expect(
      withFlowBuildDefaults(
        'create_flow_plan',
        { intent: 'Build a follow-up flow' },
        { sessionId: 'session-1', spaceId: campaignScope.space_id },
      ),
    ).toEqual({ intent: 'Build a follow-up flow' })
  })

  it('does not inject defaults for global actions', () => {
    expect(withScopeDefaults('save_user_memory', { content: 'note' }, campaignScope)).toEqual({
      content: 'note',
    })
  })

  it('pins save_customer_memory brain_id from brain-ops session keys', () => {
    const sessionKey =
      'agent:atlas:brain_ops:atlas:user-1:outbox-1::brain:187a9756-564a-44d5-9a5e-485d69555806::org:org-1'

    expect(parseBrainOpsTargetBrainIdFromSessionKey(sessionKey)).toBe(
      '187a9756-564a-44d5-9a5e-485d69555806',
    )
    expect(
      withBrainOpsActionDefaults(
        'save_customer_memory',
        {
          brain_id: '<customer_brain_id>',
          content: 'Customer wants shorter implementation cycles.',
        },
        sessionKey,
      ),
    ).toMatchObject({
      brain_id: '187a9756-564a-44d5-9a5e-485d69555806',
      content: 'Customer wants shorter implementation cycles.',
    })
  })

  it('does not pin non-customer-memory actions from brain-ops session keys', () => {
    const sessionKey =
      'agent:atlas:brain_ops:atlas:user-1:outbox-1::brain:187a9756-564a-44d5-9a5e-485d69555806'

    expect(
      withBrainOpsActionDefaults('search_customer_brain', { query: 'pricing' }, sessionKey),
    ).toEqual({ query: 'pricing' })
  })

  it('passes matching scope', () => {
    expect(
      validateScopeForAction(
        'create_task',
        { space_id: campaignScope.space_id, campaign_id: campaignScope.campaign_id },
        campaignScope,
      ),
    ).toEqual({ ok: true })
  })

  it('rejects mismatched campaign without override', () => {
    const result = validateScopeForAction(
      'create_task',
      {
        space_id: campaignScope.space_id,
        campaign_id: '00000000-0000-0000-0000-000000000099',
      },
      campaignScope,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Scope mismatch')
  })

  it('allows mismatched scope with explicit override', () => {
    expect(
      validateScopeForAction(
        'create_task',
        {
          space_id: '00000000-0000-0000-0000-000000000099',
          scope_override: true,
        },
        campaignScope,
      ),
    ).toEqual({ ok: true })
  })

  it('allows read-only Space lookups to target another accessible scope', () => {
    const otherSpaceId = '00000000-0000-0000-0000-000000000099'

    for (const [action, data] of [
      ['search_space_context', { query: 'retainer guardrails', space_id: otherSpaceId }],
      ['list_space_views', { space_id: otherSpaceId }],
      ['get_space_view', { space_id: otherSpaceId, view_id: 'list' }],
      ['list_space_view_items', { space_id: otherSpaceId, view_id: 'bugs' }],
      ['get_space_item', { space_id: otherSpaceId, item_id: 'item-1' }],
      ['list_tasks', { space_id: otherSpaceId }],
      ['get_task', { space_id: otherSpaceId, task_id: 'task-1' }],
      [
        'search_campaign_brain',
        { query: 'offer pricing ICP', campaign_id: '00000000-0000-0000-0000-0000000000aa' },
      ],
    ] as const) {
      expect(validateScopeForAction(action, data, campaignScope)).toEqual({ ok: true })
    }
  })

  it('allows broad all-accessible Space search with explicit override', () => {
    expect(
      validateScopeForAction(
        'search_space_context',
        {
          query: 'retainer guardrails',
          mode: 'all_accessible',
          scope_override: true,
        },
        campaignScope,
      ),
    ).toEqual({ ok: true })
  })

  it('keeps cross-scope Space writes blocked without explicit override', () => {
    const otherSpaceId = '00000000-0000-0000-0000-000000000099'

    for (const [action, data] of [
      ['create_task', { space_id: otherSpaceId, title: 'Follow up' }],
      ['update_task', { space_id: otherSpaceId, task_id: 'task-1', title: 'Follow up' }],
      ['delete_task', { space_id: otherSpaceId, task_id: 'task-1' }],
      ['add_task_comment', { space_id: otherSpaceId, task_id: 'task-1', message: 'Reviewed' }],
      ['create_space_field', { space_id: otherSpaceId, name: 'Stage', type: 'select' }],
      ['update_space_field', { space_id: otherSpaceId, field_id: 'stage', name: 'Stage' }],
    ] as const) {
      const result = validateScopeForAction(action, data, campaignScope)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toContain('Scope mismatch')
    }
  })

  it('skips validation when the active scope is unknown', () => {
    expect(validateScopeForAction('create_task', { campaign_id: 'campaign-b' }, null)).toEqual({
      ok: true,
    })
  })
})

import { describe, expect, it } from 'vitest'
import * as Policy from './index'
import {
  ACTION_TO_DOMAIN,
  ACTIONS,
  createCapabilityKey,
  DOMAINS,
  filterPromptModeActiveActions,
  getActionDomain,
  isPromptModeActionOnHold,
  ON_HOLD_PROMPTMODE_ACTIONS,
  PRESETS,
  resolveActionPolicy,
  resolveEffectiveDomains,
  ROLE_TO_DOMAINS,
  type Action,
  type Domain,
} from './index'

const expectedOnHoldPromptModeActions = [
  'create_project',
  'get_project',
  'list_projects',
  'create_file',
  'update_file',
  'read_file',
  'delete_file',
  'list_project_files',
  'update_project_deps',
  'import_github_repo',
  'get_project_logs',
  'restart_project',
  'fetch_project_url',
  'patch_file',
  'search_project_files',
  'list_project_directory',
  'get_project_errors',
  'validate_project',
  'supabase_list_tables',
  'supabase_run_sql',
  'supabase_create_table',
  'supabase_insert_rows',
  'supabase_update_rows',
  'supabase_delete_rows',
] as const

describe('@vibey/agent-policy registry', () => {
  it('maps every action to exactly one known domain', () => {
    expect(Object.keys(ACTION_TO_DOMAIN).sort()).toEqual([...ACTIONS].sort())

    for (const action of ACTIONS) {
      expect(DOMAINS).toContain(ACTION_TO_DOMAIN[action])
    }

    for (const removed of [
      'save_memory',
      'search_memory',
      'search_sk_entries',
      'search_campaign_knowledge',
      'ingest_campaign_file',
      'ingest_campaign_url',
    ]) {
      expect(ACTIONS).not.toContain(removed)
    }
  })

  it('keeps on-hold PromptMode actions out of the active policy surface', () => {
    expect([...ON_HOLD_PROMPTMODE_ACTIONS].sort()).toEqual(
      [...expectedOnHoldPromptModeActions].sort(),
    )
    expect(ON_HOLD_PROMPTMODE_ACTIONS).toHaveLength(24)

    for (const action of ON_HOLD_PROMPTMODE_ACTIONS) {
      expect(isPromptModeActionOnHold(action)).toBe(true)
      expect(ACTIONS).not.toContain(action)
      expect(Object.prototype.hasOwnProperty.call(ACTION_TO_DOMAIN, action)).toBe(false)
    }

    expect(
      filterPromptModeActiveActions(['create_object', 'create_project', 'supabase_run_sql']),
    ).toEqual(['create_object'])
    expect(ACTIONS).toEqual(
      expect.arrayContaining([
        'define_object_type',
        'list_object_types',
        'create_object',
        'list_objects',
      ]),
    )
  })

  it('keeps critical action classifications stable', () => {
    const expected: Partial<Record<Action, Domain>> = {
      create_offer: 'write_marketing_artifacts',
      get_campaign: 'read_campaign',
      update_campaign_context: 'edit_campaign',
      answer_mission_question: 'manage_mission_control',
      retry_mission_subtask: 'manage_mission_control',
      search_user_brain: 'read_brain_personal',
      synthesize_user_brain_topic: 'read_brain_personal',
      search_brain_context: 'read_brain_personal',
      search_space_context: 'read_space_context',
      list_contacts: 'read_contacts',
      get_contact: 'read_contacts',
      get_contact_activity: 'read_contacts',
      list_contact_communications: 'read_contacts',
      create_contact: 'edit_contacts',
      update_contact: 'edit_contacts',
      add_contact_note: 'edit_contacts',
      update_contact_note: 'edit_contacts',
      ingest_agent_brain_text: 'write_brain',
      create_agent: 'manage_team_identity',
      list_agent_skills: 'manage_own_skills',
      delete_agent_skill: 'manage_agents',
      create_docx: 'manage_content',
      use_integration: 'use_integrations',
      list_calendar_events: 'use_integrations',
      get_person_agenda: 'use_integrations',
      list_org_upcoming: 'use_integrations',
      get_person_briefing: 'use_integrations',
      create_calendar_event: 'use_integrations',
      update_calendar_event: 'use_integrations',
      delete_calendar_event: 'use_integrations',
      use_mcp_tool: 'use_mcp',
      get_company_brain_objects: 'read_brain_company',
      search_company_brain: 'read_brain_company',
      propose_company_brain_signal: 'edit_brain_company',
      create_company_brain_object: 'edit_brain_company',
      delete_company_brain_edge: 'edit_brain_company',
      search_customer_brain: 'read_brain_customer',
      save_customer_memory: 'edit_brain_customer',
      search_flow_capabilities: 'read_flows',
      get_flow_capability: 'read_flows',
      list_flows: 'read_flows',
      get_flow: 'read_flows',
      create_flow_draft: 'manage_flows',
      update_flow_draft: 'manage_flows',
      validate_flow_draft: 'manage_flows',
      publish_flow: 'manage_flows',
      get_flow_build_context: 'read_flows',
      create_flow_clarification: 'manage_flows',
      create_flow_plan: 'manage_flows',
      update_flow_plan: 'manage_flows',
      answer_flow_clarification: 'manage_flows',
      validate_flow_plan: 'manage_flows',
      compile_flow_plan: 'manage_flows',
      list_flow_blueprints: 'read_flows',
      get_flow_blueprint: 'read_flows',
      create_flow_blueprint_draft: 'manage_flows',
      validate_flow_blueprint: 'manage_flows',
      activate_flow_blueprint: 'manage_flows',
      evaluate_flow_plan: 'manage_flows',
    }

    for (const [action, domain] of Object.entries(expected) as Array<[Action, Domain]>) {
      expect(getActionDomain(action)).toBe(domain)
    }
  })

  it('separates regular user memory from specialized brain writes', () => {
    expect(DOMAINS).toContain('write_user_memory')
    expect(DOMAINS).toContain('read_space_context')
    expect(DOMAINS).not.toContain('read_brain_campaign')
    expect(getActionDomain('save_user_memory')).toBe('write_user_memory')

    for (const action of [
      'ingest_user_brain_document',
      'ingest_agent_brain_text',
      'create_brain_page',
    ] satisfies Action[]) {
      expect(getActionDomain(action)).toBe('write_brain')
    }

    expect(getActionDomain('create_strategy_node')).toBe('edit_brain_models')
  })
})

describe('@vibey/agent-policy role defaults', () => {
  it('defines defaults only with known domains', () => {
    for (const domains of Object.values(ROLE_TO_DOMAINS)) {
      for (const domain of domains) {
        expect(DOMAINS).toContain(domain)
      }
    }
  })

  it('preserves critical current role intent', () => {
    expect(ROLE_TO_DOMAINS.system_hr).toEqual([
      'read_campaign',
      'edit_campaign',
      'read_brain_company',
      'write_user_memory',
      'manage_agents',
      'manage_team_identity',
      'manage_own_skills',
      'manage_team_skills',
      'communicate',
    ])
    expect(ROLE_TO_DOMAINS.system_builder).not.toContain('write_brain')
    expect(ROLE_TO_DOMAINS.system_flows).toEqual([
      'read_space_context',
      'manage_tasks_missions',
      'read_flows',
      'manage_flows',
      'use_integrations',
      'communicate',
      'use_mcp',
    ])
    expect(ROLE_TO_DOMAINS.system_delegation).toEqual([
      'read_campaign',
      'read_marketing_artifacts',
      'read_space_context',
      'read_contacts',
      'manage_tasks_missions',
      'use_integrations',
      'read_brain_personal',
      'read_brain_agent',
      'read_brain_company',
      'read_brain_customer',
      'communicate',
      'use_mcp',
    ])
    expect(ROLE_TO_DOMAINS.system_delegation).not.toContain('edit_campaign')
    expect(ROLE_TO_DOMAINS.system_delegation).not.toContain('write_brain')
    expect(ROLE_TO_DOMAINS.system_builder).not.toContain('code_projects')
    expect(ROLE_TO_DOMAINS.vibey_ceo).not.toContain('code_projects')
    expect(ROLE_TO_DOMAINS.vibey_ceo).toContain('edit_campaign')
    expect(ROLE_TO_DOMAINS.managed_marketing_employee).toContain('write_marketing_artifacts')
  })

  it('keeps managed defaults away from protected and unshipped domains', () => {
    for (const role of [
      'managed_marketing_employee',
      'managed_analyst_employee',
      'managed_developer_employee',
      'managed_operations_employee',
    ] as const) {
      expect(ROLE_TO_DOMAINS[role]).toContain('write_user_memory')
      expect(ROLE_TO_DOMAINS[role]).toContain('read_contacts')
      expect(ROLE_TO_DOMAINS[role]).toContain('edit_contacts')
      expect(ROLE_TO_DOMAINS[role]).not.toContain('write_brain')
      expect(ROLE_TO_DOMAINS[role]).not.toContain('edit_brain_models')
      expect(ROLE_TO_DOMAINS[role]).not.toContain('code_projects')
      expect(ROLE_TO_DOMAINS[role]).not.toContain('custom_db')
    }
  })
})

describe('@vibey/agent-policy resolver', () => {
  it('resolves team, agent allow, and agent deny precedence', () => {
    const effective = resolveEffectiveDomains({
      roleDomains: ['read_campaign'],
      teamGrants: ['write_marketing_artifacts'],
      agentAllowExtra: ['use_integrations'],
      agentDeny: ['write_marketing_artifacts'],
    })

    expect(effective).toEqual(new Set<Domain>(['read_campaign', 'use_integrations']))
  })

  it('reports source level for role default, team grant, allow extra, and deny', () => {
    const base = {
      roleDomains: ['read_campaign'] satisfies Domain[],
      teamGrants: ['write_marketing_artifacts'] satisfies Domain[],
      agentAllowExtra: ['use_integrations'] satisfies Domain[],
      agentDeny: [] satisfies Domain[],
    }

    expect(resolveActionPolicy('get_campaign', base)).toMatchObject({
      allowed: true,
      sourceLevel: 'role_default',
    })
    expect(resolveActionPolicy('create_offer', base)).toMatchObject({
      allowed: true,
      sourceLevel: 'team_grant',
    })
    expect(resolveActionPolicy('use_integration', base)).toMatchObject({
      allowed: true,
      sourceLevel: 'agent_allow_extra',
    })
    expect(
      resolveActionPolicy('create_offer', {
        ...base,
        agentDeny: ['write_marketing_artifacts'],
      }),
    ).toMatchObject({
      allowed: false,
      sourceLevel: 'agent_deny',
    })
  })

  it('uses stable capability keys for DB rows', () => {
    expect(createCapabilityKey('action_domain', 'read_campaign')).toBe(
      'action_domain:read_campaign',
    )
  })
})

describe('@vibey/agent-policy presets', () => {
  it('outputs known domains only', () => {
    for (const preset of Object.values(PRESETS)) {
      for (const domain of preset.domains) {
        expect(DOMAINS).toContain(domain)
      }
    }
  })

  it('keeps support agents read-oriented by default', () => {
    expect(PRESETS.support_agent.domains).toEqual([
      'read_campaign',
      'read_marketing_artifacts',
      'write_user_memory',
      'read_contacts',
      'edit_contacts',
      'manage_tasks_missions',
      'communicate',
    ])
  })
})

describe('@vibey/agent-policy action contracts', () => {
  function getActionContract(action: Action): Record<string, unknown> {
    const getter = (Policy as Record<string, unknown>).getActionContract
    expect(typeof getter).toBe('function')
    return (getter as (action: Action) => Record<string, unknown>)(action)
  }

  it('exports explicit contracts or fallback contracts for every action', () => {
    const getter = (Policy as Record<string, unknown>).getActionContract
    expect(typeof getter).toBe('function')

    for (const action of ACTIONS) {
      const contract = (getter as (action: Action) => Record<string, unknown>)(action)
      expect(contract).toMatchObject({
        action,
        domain: ACTION_TO_DOMAIN[action],
      })
    }
  })

  it('locks high-risk action meanings and ownership', () => {
    expect(getActionContract('create_presentation')).toMatchObject({
      action: 'create_presentation',
      domain: 'write_marketing_artifacts',
      family: 'artifact.presentation',
      operation: 'create',
      userPolicyAddable: true,
      delegateResolution: 'actual_access_lookup',
      delegateTargetAction: 'create_presentation',
    })

    expect(getActionContract('save_user_memory')).toMatchObject({
      action: 'save_user_memory',
      domain: 'write_user_memory',
      family: 'brain.memory',
      operation: 'create',
      sharedOwners: expect.arrayContaining(['vibey', 'atlas', 'hr', 'managed']),
      userPolicyAddable: true,
    })

    expect(getActionContract('search_brain_context')).toMatchObject({
      action: 'search_brain_context',
      domain: 'read_brain_personal',
      family: 'brain.memory',
      operation: 'search',
      sharedOwners: expect.arrayContaining(['vibey', 'atlas', 'hr', 'managed']),
      userPolicyAddable: true,
    })

    expect(getActionContract('search_space_context')).toMatchObject({
      action: 'search_space_context',
      domain: 'read_space_context',
      family: 'space.context',
      operation: 'search',
      sharedOwners: ['vibey', 'loop', 'delegator', 'managed'],
      userPolicyAddable: true,
      requiresExplicitUserIntent: false,
      schemaRef: 'ACTION_SCHEMAS.search_space_context',
    })

    for (const [action, operation] of [
      ['create_task', 'create'],
      ['update_task', 'update'],
    ] as Array<[Action, string]>) {
      expect(getActionContract(action)).toMatchObject({
        action,
        domain: 'manage_tasks_missions',
        family: 'task',
        operation,
        sharedOwners: ['vibey', 'loop', 'delegator', 'managed'],
        userPolicyAddable: true,
        requiresExplicitUserIntent: true,
        schemaRef: `ACTION_SCHEMAS.${action}`,
      })
    }

    for (const [action, operation] of [
      ['create_space_field', 'create'],
      ['update_space_field', 'update'],
      ['append_space_field_option', 'update'],
      ['create_space_status', 'create'],
      ['create_space_category', 'create'],
      ['create_space_tag', 'create'],
      ['create_space_view', 'create'],
      ['update_space_view', 'update'],
    ] as Array<[Action, string]>) {
      expect(getActionContract(action)).toMatchObject({
        action,
        domain: 'manage_tasks_missions',
        family: 'space.schema',
        operation,
        sharedOwners: ['vibey', 'loop', 'managed'],
        userPolicyAddable: true,
        requiresExplicitUserIntent: true,
        schemaRef: `ACTION_SCHEMAS.${action}`,
      })
    }

    for (const action of [
      'run_social_research_search',
      'run_ads_research_search',
      'search_ads_research_advertisers',
    ] satisfies Action[]) {
      expect(getActionContract(action)).toMatchObject({
        action,
        domain: 'manage_tasks_missions',
        family: 'space.research',
        operation: 'search',
        sharedOwners: ['vibey', 'managed'],
        userPolicyAddable: true,
        requiresExplicitUserIntent: true,
        schemaRef: `ACTION_SCHEMAS.${action}`,
      })
    }

    for (const action of [
      'ingest_user_brain_document',
      'ingest_agent_brain_text',
      'create_brain_page',
    ] satisfies Action[]) {
      expect(getActionContract(action)).toMatchObject({
        exclusiveOwner: 'atlas',
        userPolicyAddable: false,
        delegateResolution: 'exact_system_agent',
      })
    }

    expect(getActionContract('create_strategy_node')).toMatchObject({
      exclusiveOwner: 'atlas',
      family: 'strategy',
      userPolicyAddable: false,
      requiresExplicitUserIntent: true,
    })

    for (const action of ['create_agent', 'update_agent'] satisfies Action[]) {
      expect(getActionContract(action)).toMatchObject({
        exclusiveOwner: 'hr',
        family: 'team',
        userPolicyAddable: false,
        delegateResolution: 'exact_system_agent',
      })
    }

    for (const action of ['ask_agent', 'delegate_to_agent'] satisfies Action[]) {
      expect(getActionContract(action)).toMatchObject({
        family: 'communication',
        operation: action === 'ask_agent' ? 'ask' : 'delegate',
      })
    }

    for (const [action, operation] of [
      ['list_calendar_events', 'read'],
      ['get_person_agenda', 'read'],
      ['list_org_upcoming', 'read'],
      ['get_person_briefing', 'read'],
      ['create_calendar_event', 'create'],
      ['update_calendar_event', 'update'],
      ['delete_calendar_event', 'delete'],
    ] as Array<[Action, string]>) {
      expect(getActionContract(action)).toMatchObject({
        action,
        domain: 'use_integrations',
        family: 'integration.calendar',
        operation,
        userPolicyAddable: true,
        requiresExplicitUserIntent: operation !== 'read',
        forbiddenUnlessExplicit: operation === 'delete',
        skillKeys: expect.arrayContaining(['vibey-api']),
        schemaRef: `ACTION_SCHEMAS.${action}`,
      })
    }

    for (const action of [
      'answer_mission_question',
      'summarize_mission_state',
      'attach_mission_context',
      'show_mission_deliverable',
      'create_mission_subtask',
      'edit_mission_subtask',
      'cancel_mission_subtask',
      'retry_mission_subtask',
      'reassign_mission_subtask',
      'prepare_mission_replan',
      'approve_mission',
    ] satisfies Action[]) {
      const readOnly =
        action === 'answer_mission_question' ||
        action === 'summarize_mission_state' ||
        action === 'show_mission_deliverable'
      expect(getActionContract(action)).toMatchObject({
        domain: 'manage_mission_control',
        family: 'mission.manager',
        exclusiveOwner: 'vibey',
        userPolicyAddable: false,
        requiresExplicitUserIntent: !readOnly,
        forbiddenUnlessExplicit: !readOnly,
        delegateResolution: 'exact_system_agent',
      })
    }

    expect(getActionContract('describe_action')).toMatchObject({
      family: 'communication',
      operation: 'read',
      sharedOwners: expect.arrayContaining(['vibey', 'atlas', 'hr', 'managed']),
      userPolicyAddable: false,
      hideFromArtifactTurns: true,
    })

    for (const action of [
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
    ] satisfies Action[]) {
      expect(getActionContract(action)).toMatchObject({
        family: 'flow',
        exclusiveOwner: 'loop',
        userPolicyAddable: false,
        delegateResolution: 'exact_system_agent',
        delegateTargetAction: action,
        skillKeys: expect.arrayContaining(['flow-builder', 'vibey-api']),
      })
    }

    for (const action of [
      'get_company_brain_objects',
      'get_company_brain_object_edges',
      'search_company_brain',
    ] satisfies Action[]) {
      expect(getActionContract(action)).toMatchObject({
        domain: 'read_brain_company',
        family: 'brain.memory',
        sharedOwners: expect.arrayContaining(['vibey', 'atlas', 'hr', 'managed']),
        userPolicyAddable: true,
        hideFromArtifactTurns: false,
      })
    }

    for (const action of [
      'propose_company_brain_signal',
      'create_company_brain_object',
      'update_company_brain_object',
      'archive_company_brain_object',
      'create_company_brain_edge',
      'delete_company_brain_edge',
    ] satisfies Action[]) {
      expect(getActionContract(action)).toMatchObject({
        domain: 'edit_brain_company',
        family: 'brain.model',
        exclusiveOwner: 'atlas',
        sharedOwners: expect.arrayContaining(['vibey', 'atlas']),
        userPolicyAddable: false,
        forbiddenUnlessExplicit: true,
        hideFromArtifactTurns: true,
      })
    }
  })

  it('treats skill metadata as documentation only, not proof of access', () => {
    const contract = getActionContract('create_presentation')
    expect(contract.skillKeys).toEqual(expect.any(Array))
    expect(contract).toMatchObject({
      accessProof: 'canExecuteAction',
    })
  })

  it('treats websites and forms as first-class artifact contracts and MCP tools', () => {
    expect(getActionContract('create_website')).toMatchObject({
      domain: 'write_marketing_artifacts',
      family: 'artifact.website',
      skillKeys: expect.arrayContaining(['website-builder', 'vibey-api']),
      nearMissActions: expect.arrayContaining(['create_funnel']),
    })
    expect(getActionContract('create_funnel')).toMatchObject({
      family: 'artifact.funnel',
      skillKeys: expect.arrayContaining(['funnel-builder', 'vibey-api']),
      nearMissActions: expect.arrayContaining(['create_website']),
    })
    expect(getActionContract('create_form')).toMatchObject({
      domain: 'write_marketing_artifacts',
      family: 'artifact.form',
      skillKeys: expect.arrayContaining(['vibey-api']),
      nearMissActions: expect.arrayContaining(['create_funnel']),
    })
    expect(getActionContract('attach_form_asset')).toMatchObject({
      domain: 'write_marketing_artifacts',
      family: 'artifact.form',
      schemaRef: 'ACTION_SCHEMAS.attach_form_asset',
    })

    expect(Policy.getMcpToolByAction('create_website')).toMatchObject({
      toolName: 'create_website',
    })
    expect(Policy.getMcpToolByAction('create_form')).toMatchObject({
      toolName: 'create_form',
    })
    expect(Policy.getMcpToolByAction('attach_form_asset')).toMatchObject({
      toolName: 'attach_form_asset',
    })
    expect(Policy.getMcpToolByAction('list_websites')).toMatchObject({
      toolName: 'list_websites',
    })
    expect(Policy.getMcpToolByAction('list_forms')).toMatchObject({
      toolName: 'list_forms',
    })
    expect(Policy.getMcpPermissionGroupsForScopes(['write_marketing_artifacts'])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'marketing_assets',
          includedActions: expect.arrayContaining([
            'create_website',
            'add_website_page',
            'create_form',
            'attach_form_asset',
          ]),
        }),
      ]),
    )
  })

  it('builds inline access requests only for grantable actions', () => {
    const builder = (Policy as Record<string, unknown>).buildInlineAccessRequestContract as (
      input: Record<string, unknown>,
    ) => Record<string, unknown> | null

    expect(
      builder({
        action: 'create_presentation',
        agentKey: 'lux',
        agentName: 'Lux',
      }),
    ).toMatchObject({
      type: 'agent_access_request',
      agent_key: 'lux',
      agent_name: 'Lux',
      missing_capability: {
        kind: 'action_domain',
        id: 'write_marketing_artifacts',
      },
      required_action: 'create_presentation',
      approve_action: 'agent_policy_allow_extra',
    })

    expect(
      builder({
        action: 'create_calendar_event',
        agentKey: 'ops',
        agentName: 'Ops',
      }),
    ).toMatchObject({
      type: 'agent_access_request',
      missing_capability: {
        kind: 'action_domain',
        id: 'use_integrations',
      },
      required_action: 'create_calendar_event',
      approve_action: 'agent_policy_allow_extra',
    })

    expect(builder({ action: 'create_brain_page', agentKey: 'lux' })).toBeNull()
    expect(builder({ action: 'create_agent', agentKey: 'lux' })).toBeNull()
    expect(builder({ action: 'supabase_run_sql', agentKey: 'lux' })).toBeNull()
    expect(builder({ action: 'add_mcp_server', agentKey: 'lux' })).toBeNull()
  })
})

describe('@vibey/agent-policy system agent contracts', () => {
  it('exports protected system-agent helpers', () => {
    for (const exportName of [
      'SYSTEM_AGENT_KEYS',
      'LEGACY_SYSTEM_AGENT_KEYS',
      'SYSTEM_AGENT_CONTRACTS',
      'SKILL_WRITE_LOCKED_SYSTEM_AGENT_KEYS',
      'isProtectedSystemAgent',
      'isAtlasLikeAgent',
      'isVibeyAgent',
      'isHrAgent',
      'isLoopAgent',
      'isDelegatorAgent',
      'isSkillWriteLockedSystemAgent',
      'getSystemAgentContract',
    ]) {
      expect((Policy as Record<string, unknown>)[exportName], `${exportName} export`).toBeDefined()
    }
  })

  it('classifies protected system agents without expanding legacy builders', () => {
    const isProtectedSystemAgent = (Policy as Record<string, unknown>).isProtectedSystemAgent as (
      agentKey: string,
    ) => boolean
    const isAtlasLikeAgent = (Policy as Record<string, unknown>).isAtlasLikeAgent as (
      agentKey: string,
    ) => boolean
    const isVibeyAgent = (Policy as Record<string, unknown>).isVibeyAgent as (
      agentKey: string,
    ) => boolean
    const isHrAgent = (Policy as Record<string, unknown>).isHrAgent as (agentKey: string) => boolean
    const isLoopAgent = (Policy as Record<string, unknown>).isLoopAgent as (
      agentKey: string,
    ) => boolean
    const isDelegatorAgent = (Policy as Record<string, unknown>).isDelegatorAgent as (
      agentKey: string,
    ) => boolean
    const isSkillWriteLockedSystemAgent = (Policy as Record<string, unknown>)
      .isSkillWriteLockedSystemAgent as (agentKey: string) => boolean

    expect(isProtectedSystemAgent('vibey')).toBe(true)
    expect(isVibeyAgent('vibey')).toBe(true)
    expect(isProtectedSystemAgent('atlas')).toBe(true)
    expect(isAtlasLikeAgent('atlas')).toBe(true)
    expect(isAtlasLikeAgent('brain_scholar')).toBe(true)
    expect(isProtectedSystemAgent('hr')).toBe(true)
    expect(isHrAgent('hr')).toBe(true)
    expect(isProtectedSystemAgent('loop')).toBe(true)
    expect(isLoopAgent('loop')).toBe(true)
    expect(isProtectedSystemAgent('delegator')).toBe(true)
    expect(isDelegatorAgent('delegator')).toBe(true)
    expect(isSkillWriteLockedSystemAgent('hr')).toBe(false)
    expect(isSkillWriteLockedSystemAgent('vibey')).toBe(false)
    expect(isSkillWriteLockedSystemAgent('atlas')).toBe(true)
    expect(isSkillWriteLockedSystemAgent('brain_scholar')).toBe(true)
    expect(isSkillWriteLockedSystemAgent('viktor')).toBe(true)
    expect(isSkillWriteLockedSystemAgent('widget_builder')).toBe(true)
    expect(isSkillWriteLockedSystemAgent('delegator')).toBe(true)

    expect(isProtectedSystemAgent('viktor')).toBe(false)
    expect(isProtectedSystemAgent('widget_builder')).toBe(false)
  })

  it('canonicalAgentKey strips shared-runtime gateway scope prefixes', () => {
    const canonicalAgentKey = (Policy as Record<string, unknown>).canonicalAgentKey as (
      agentKey: string,
    ) => string

    expect(canonicalAgentKey('user-123e4567-e89b-42d3-a456-426614174000-vibey')).toBe('vibey')
    expect(canonicalAgentKey('org-123e4567-e89b-42d3-a456-426614174000-vibey')).toBe('vibey')
    expect(canonicalAgentKey('user-123e4567-e89b-42d3-a456-426614174000-brain_scholar')).toBe(
      'brain_scholar',
    )
    expect(canonicalAgentKey('vibey')).toBe('vibey')
    expect(canonicalAgentKey('  vibey  ')).toBe('vibey')
    expect(canonicalAgentKey('user-not-a-uuid-vibey')).toBe('user-not-a-uuid-vibey')
    expect(canonicalAgentKey('')).toBe('')
  })
})

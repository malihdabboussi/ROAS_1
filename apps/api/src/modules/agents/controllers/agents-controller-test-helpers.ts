import { vi } from 'vitest'
import { AgentsRepository } from '../repositories/agents.repository'
import { AgentsService } from '../services/agents.service'
import { AgentConfigController } from './agent-config.controller'
import { AgentSkillsController } from './agent-skills.controller'
import { AgentWidgetController } from './agent-widget.controller'
import { AgentWorkflowsController } from './agent-workflows.controller'
import { AgentsController } from './agents.controller'

type MockFn = ReturnType<typeof vi.fn>
export type AgentOperationsMock = Record<string, MockFn>
type SupabaseChainMock = Record<string, MockFn>
export type WidgetSupabaseMock = {
  from: MockFn
  auth: { getUser: MockFn }
  chains: Record<string, SupabaseChainMock>
}
export type AwarenessSupabaseMock = {
  from: MockFn
  chain: SupabaseChainMock
}
export type HireReadySupabaseMock = {
  from: MockFn
  chains: Record<string, SupabaseChainMock>
}

export function makeAgentOperations(): AgentOperationsMock {
  return {
    listAgents: vi.fn().mockResolvedValue([{ agent_key: 'vibey', name: 'Vibey' }]),
    listAgentsSlim: vi.fn().mockResolvedValue([{ agent_key: 'vibey', name: 'Vibey' }]),
    listAgentUserState: vi
      .fn()
      .mockResolvedValue([
        { agent_id: 'agent-1', is_favorite: true, updated_at: '2026-05-21T00:00:00Z' },
      ]),
    upsertAgentUserState: vi.fn().mockResolvedValue({
      agent_id: 'agent-1',
      is_favorite: true,
      updated_at: '2026-05-21T00:00:00Z',
    }),
    renameAgent: vi.fn().mockResolvedValue({ agent_key: 'copywriter', name: 'New Name' }),
    updateAgentActive: vi.fn().mockResolvedValue({ agent_key: 'copywriter', is_active: false }),
    repairAgentSetup: vi.fn().mockResolvedValue({
      ok: true,
      repaired: true,
      sync_status: 'ready',
      agent: { agent_key: 'copywriter', sync_status: 'ready' },
      reasons: [],
    }),
    updateAgentImage: vi
      .fn()
      .mockResolvedValue({ agent_key: 'copywriter', image_url: 'https://example.com/a.png' }),
    updateAgentVoiceName: vi.fn().mockResolvedValue({ agent_key: 'copywriter' }),
    patchAgentConfig: vi
      .fn()
      .mockResolvedValue({ agent_key: 'copywriter', config: { model_id: 'auto' } }),
    listAgentSkills: vi.fn().mockResolvedValue([{ id: 'skill-1', skill_key: 'copy' }]),
    createAgentSkill: vi.fn().mockResolvedValue({ id: 'skill-1', skill_key: 'copy' }),
    updateAgentSkill: vi.fn().mockResolvedValue({ id: 'skill-1', name: 'Copy' }),
    deleteAgentSkill: vi.fn().mockResolvedValue({ deleted: true }),
    createAgentSkillResource: vi
      .fn()
      .mockResolvedValue({ id: 'resource-1', file_path: 'docs/example.md' }),
    uploadSkillAsset: vi
      .fn()
      .mockResolvedValue({ id: 'asset-1', url: 'https://example.com/a.png' }),
    listAgentWorkflows: vi.fn().mockResolvedValue([{ id: 'workflow-1', workflow_key: 'draft' }]),
    createAgentWorkflow: vi.fn().mockResolvedValue({ id: 'workflow-1', workflow_key: 'draft' }),
    updateAgentWorkflow: vi.fn().mockResolvedValue({ id: 'workflow-1', name: 'Draft' }),
    deleteAgentWorkflow: vi.fn().mockResolvedValue({ deleted: true }),
    assertCanManageAgent: vi.fn().mockResolvedValue(undefined),
    hireReadyEmployee: vi.fn().mockResolvedValue({ agent_key: 'copywriter' }),
  }
}

export function makeController(agentOperations: AgentOperationsMock = makeAgentOperations()): AgentsController {
  return new AgentsController(
    agentOperations as never,
    new AgentsService(agentOperations as never, new AgentsRepository()) as never,
  )
}

export function makeConfigController(agentOperations: AgentOperationsMock = makeAgentOperations()): AgentConfigController {
  return new AgentConfigController(agentOperations as never)
}

export function makeSkillsController(agentOperations: AgentOperationsMock = makeAgentOperations()): AgentSkillsController {
  return new AgentSkillsController(agentOperations as never)
}

export function makeWidgetController(agentOperations: AgentOperationsMock = makeAgentOperations()): AgentWidgetController {
  return new AgentWidgetController(
    new AgentsService(agentOperations as never, new AgentsRepository()) as never,
  )
}

export function makeWorkflowsController(agentOperations: AgentOperationsMock = makeAgentOperations()): AgentWorkflowsController {
  return new AgentWorkflowsController(agentOperations as never)
}

export function makeWidgetSupabase(): WidgetSupabaseMock {
  const chains: Record<string, any> = {}
  const makeChain = (name: string, result: { data: any; error: any }) => {
    const chain: Record<string, any> = {}
    for (const method of ['select', 'eq', 'is', 'update']) {
      chain[method] = vi.fn().mockReturnValue(chain)
    }
    chain.maybeSingle = vi.fn().mockResolvedValue(result)
    chain.then = Promise.resolve(result).then.bind(Promise.resolve(result))
    chains[name] = chain
    return chain
  }
  const agentRegistry = makeChain('agents_registry', {
    data: {
      public_page_token: 'token-1',
      widget_enabled: true,
      widget_title: 'Widget',
      widget_subtitle: 'Help',
      widget_show_subtitle: true,
      widget_greeting: 'Hi',
      widget_accent_color: '#7C3AED',
      widget_launcher_icon_url: null,
      widget_header_image_url: null,
      widget_position: 'bottom-right',
      widget_allowed_origins: ['https://example.com'],
      widget_home_config: {},
      widget_help_articles: [],
      widget_help_collections: [],
      widget_news_items: [],
      widget_campaign_id: null,
    },
    error: null,
  })
  const profiles = makeChain('profiles', {
    data: { public_agent_slug: 'sefy' },
    error: null,
  })
  const organizations = makeChain('organizations', {
    data: { slug: 'vibey' },
    error: null,
  })
  const campaigns = makeChain('campaigns', {
    data: { id: 'campaign-1' },
    error: null,
  })
  return {
    from: vi.fn((table: string) => {
      if (table === 'agents_registry') return agentRegistry
      if (table === 'profiles') return profiles
      if (table === 'organizations') return organizations
      if (table === 'campaigns') return campaigns
      return makeChain(table, { data: null, error: null })
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'sefy@example.com' } } }),
    },
    chains,
  }
}

export function makeAwarenessSupabase(result = { data: [{ id: 'point-1' }], error: null }): AwarenessSupabaseMock {
  const chain: Record<string, any> = {}
  for (const method of ['select', 'eq', 'is', 'order', 'limit', 'update']) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain.then = Promise.resolve(result).then.bind(Promise.resolve(result))

  return {
    from: vi.fn((table: string) => {
      if (table === 'agent_awareness_points') return chain
      throw new Error(`unexpected table: ${table}`)
    }),
    chain,
  }
}

export function makeHireReadySupabase({
  template = { level: 'employee' },
  membership = { team_id: 'team-1' },
  templateError = null,
  membershipError = null,
}: {
  template?: any
  membership?: any
  templateError?: any
  membershipError?: any
} = {}): HireReadySupabaseMock {
  const makeChain = (result: { data: any; error: any }) => {
    const chain: Record<string, any> = {}
    for (const method of ['select', 'eq']) {
      chain[method] = vi.fn().mockReturnValue(chain)
    }
    chain.maybeSingle = vi.fn().mockResolvedValue(result)
    return chain
  }
  const templateChain = makeChain({ data: template, error: templateError })
  const membershipChain = makeChain({ data: membership, error: membershipError })

  return {
    from: vi.fn((table: string) => {
      if (table === 'agent_employee_templates') return templateChain
      if (table === 'agent_team_members') return membershipChain
      throw new Error(`unexpected table: ${table}`)
    }),
    chains: {
      agent_employee_templates: templateChain,
      agent_team_members: membershipChain,
    },
  }
}

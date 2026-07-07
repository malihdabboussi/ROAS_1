import { describe, expect, it } from 'vitest'
import {
  makeAgentOperations,
  makeAwarenessSupabase,
  makeConfigController,
  makeController,
  makeHireReadySupabase,
} from './agents-controller-test-helpers'

describe('AgentsController read and config routes', () => {
  it('lists agents from the new /agents surface', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(controller.listAgents(user, supabase, scope)).resolves.toEqual([
      { agent_key: 'vibey', name: 'Vibey' },
    ])
    expect(agentOperations.listAgents).toHaveBeenCalledWith(supabase, 'user-1', 'org-1')
  })

  it('lists slim agents from the new /agents/slim surface', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: null, orgRole: null }

    await expect(controller.listAgentsSlim(user, supabase, scope)).resolves.toEqual([
      { agent_key: 'vibey', name: 'Vibey' },
    ])
    expect(agentOperations.listAgentsSlim).toHaveBeenCalledWith(supabase, 'user-1', null)
  })

  it('lists per-user agent state from /agents/user-state', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }

    await expect(controller.listAgentUserState(user, supabase)).resolves.toEqual([
      { agent_id: 'agent-1', is_favorite: true, updated_at: '2026-05-21T00:00:00Z' },
    ])
    expect(agentOperations.listAgentUserState).toHaveBeenCalledWith(supabase, 'user-1')
  })

  it('lists awareness points scoped to the active organization', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeController(agentOperations)
    const supabase = makeAwarenessSupabase({ data: [{ id: 'point-1' }], error: null })
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(controller.listAwarenessPoints(user, supabase as never, scope)).resolves.toEqual([
      { id: 'point-1' },
    ])
    expect(supabase.from).toHaveBeenCalledWith('agent_awareness_points')
    expect(supabase.chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(supabase.chain.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('marks unread awareness points as read within the active organization', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeController(agentOperations)
    const supabase = makeAwarenessSupabase({ data: null, error: null })
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.markAwarenessPointsRead(user, supabase as never, scope),
    ).resolves.toEqual({
      ok: true,
    })
    expect(supabase.from).toHaveBeenCalledWith('agent_awareness_points')
    expect(supabase.chain.update).toHaveBeenCalledWith({ read_at: expect.any(String) })
    expect(supabase.chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(supabase.chain.is).toHaveBeenCalledWith('read_at', null)
    expect(supabase.chain.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('updates per-user agent state from /agents/:agentKey/user-state', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeConfigController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.updateAgentUserState(user, supabase, 'copywriter', scope, { is_favorite: true }),
    ).resolves.toEqual({
      agent_id: 'agent-1',
      is_favorite: true,
      updated_at: '2026-05-21T00:00:00Z',
    })
    expect(agentOperations.upsertAgentUserState).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'org-1',
      { is_favorite: true },
    )
  })

  it('renames an agent from /agents/:agentKey/name', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeConfigController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.renameAgent(user, supabase, 'copywriter', { name: 'New Name' }, scope),
    ).resolves.toEqual({ agent_key: 'copywriter', name: 'New Name' })
    expect(agentOperations.renameAgent).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'New Name',
      'org-1',
    )
  })

  it('updates active state from /agents/:agentKey/active', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeConfigController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: null, orgRole: null }

    await expect(
      controller.updateAgentActive(user, supabase, 'copywriter', { active: false }, scope),
    ).resolves.toEqual({ agent_key: 'copywriter', is_active: false })
    expect(agentOperations.updateAgentActive).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      false,
      null,
    )
  })

  it('hires ready employees after validating template and team membership', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeController(agentOperations)
    const supabase = makeHireReadySupabase()
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'creator' }
    const body = { role_key: 'copywriter', name: 'Copywriter', team_id: 'team-1' }

    await expect(
      controller.hireReadyEmployee(user, supabase as never, body, scope),
    ).resolves.toEqual({
      agent_key: 'copywriter',
    })
    expect(supabase.chains.agent_employee_templates.eq).toHaveBeenCalledWith(
      'role_key',
      'copywriter',
    )
    expect(supabase.chains.agent_employee_templates.eq).toHaveBeenCalledWith('is_enabled', true)
    expect(supabase.chains.agent_team_members.eq).toHaveBeenCalledWith('team_id', 'team-1')
    expect(supabase.chains.agent_team_members.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(agentOperations.hireReadyEmployee).toHaveBeenCalledWith(
      supabase,
      'user-1',
      body,
      'org-1',
    )
  })

  it('rejects ready C-level templates before hiring', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeController(agentOperations)
    const supabase = makeHireReadySupabase({ template: { level: 'c_level' } })
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.hireReadyEmployee(
        user,
        supabase as never,
        { role_key: 'ceo', team_id: 'team-1' },
        scope,
      ),
    ).rejects.toThrow('C-level agents are platform-managed')
    expect(agentOperations.hireReadyEmployee).not.toHaveBeenCalled()
  })

  it('repairs setup from /agents/:agentKey/repair-setup', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeConfigController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(controller.repairAgentSetup(user, supabase, 'copywriter', scope)).resolves.toEqual(
      {
        ok: true,
        repaired: true,
        sync_status: 'ready',
        agent: { agent_key: 'copywriter', sync_status: 'ready' },
        reasons: [],
      },
    )
    expect(agentOperations.repairAgentSetup).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'org-1',
    )
  })

  it('updates agent image from /agents/:agentKey/image', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeConfigController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.updateAgentImage(
        user,
        supabase,
        'copywriter',
        { image_url: 'https://example.com/a.png' },
        scope,
      ),
    ).resolves.toEqual({ agent_key: 'copywriter', image_url: 'https://example.com/a.png' })
    expect(agentOperations.updateAgentImage).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'https://example.com/a.png',
      'org-1',
    )
  })

  it('updates communication config from /agents/:agentKey/communication', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeConfigController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.updateAgentCommunication(
        user,
        supabase,
        'copywriter',
        { model_id: 'auto', voice_name: 'nova', communication_style: 'direct' },
        scope,
      ),
    ).resolves.toEqual({ agent_key: 'copywriter', config: { model_id: 'auto' } })
    expect(agentOperations.updateAgentVoiceName).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'nova',
      'org-1',
    )
    expect(agentOperations.patchAgentConfig).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      { model_id: 'auto', communication_style: 'direct' },
      'org-1',
    )
  })
})

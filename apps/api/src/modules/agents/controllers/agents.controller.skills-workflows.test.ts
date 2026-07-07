import { describe, expect, it } from 'vitest'
import {
  makeAgentOperations,
  makeSkillsController,
  makeWorkflowsController,
} from './agents-controller-test-helpers'

describe('AgentsController skills and workflow routes', () => {
  it('lists agent skills from /agents/:agentKey/skills', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeSkillsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(controller.listAgentSkills(user, supabase, 'copywriter', scope)).resolves.toEqual([
      { id: 'skill-1', skill_key: 'copy' },
    ])
    expect(agentOperations.listAgentSkills).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'org-1',
    )
  })

  it('creates agent skills from /agents/:agentKey/skills', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeSkillsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }
    const payload = {
      skill_key: 'copy',
      name: 'Copy',
      description: 'Writes copy',
      markdown_content: '# Copy',
    }

    await expect(
      controller.createAgentSkill(user, supabase, 'copywriter', payload, scope),
    ).resolves.toEqual({
      id: 'skill-1',
      skill_key: 'copy',
    })
    expect(agentOperations.createAgentSkill).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      payload,
      'org-1',
    )
  })

  it('updates agent skills from /agents/:agentKey/skills/:skillId', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeSkillsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: null, orgRole: null }

    await expect(
      controller.updateAgentSkill(user, supabase, 'copywriter', 'skill-1', { name: 'Copy' }, scope),
    ).resolves.toEqual({ id: 'skill-1', name: 'Copy' })
    expect(agentOperations.updateAgentSkill).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'skill-1',
      { name: 'Copy' },
      null,
    )
  })

  it('deletes agent skills from /agents/:agentKey/skills/:skillId', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeSkillsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: null, orgRole: null }

    await expect(
      controller.deleteAgentSkill(user, supabase, 'copywriter', 'skill-1', scope),
    ).resolves.toEqual({ deleted: true })
    expect(agentOperations.deleteAgentSkill).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'skill-1',
      null,
    )
  })

  it('creates skill resources from /agents/:agentKey/skills/:skillKey/resources', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeSkillsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }
    const payload = { file_path: 'docs/example.md', content: '# Example' }

    await expect(
      controller.createAgentSkillResource(user, supabase, 'copywriter', 'copy', payload, scope),
    ).resolves.toEqual({ id: 'resource-1', file_path: 'docs/example.md' })
    expect(agentOperations.createAgentSkillResource).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'copy',
      payload,
      'org-1',
    )
  })

  it('lists agent workflows from /agents/:agentKey/workflows', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeWorkflowsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.listAgentWorkflows(user, supabase, 'copywriter', scope),
    ).resolves.toEqual([{ id: 'workflow-1', workflow_key: 'draft' }])
    expect(agentOperations.listAgentWorkflows).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'org-1',
    )
  })

  it('creates agent workflows from /agents/:agentKey/workflows', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeWorkflowsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }
    const payload = {
      workflow_key: 'draft',
      name: 'Draft',
      description: 'Drafts things',
      markdown_content: '# Draft',
      steps: [],
    }

    await expect(
      controller.createAgentWorkflow(user, supabase, 'copywriter', payload, scope),
    ).resolves.toEqual({ id: 'workflow-1', workflow_key: 'draft' })
    expect(agentOperations.createAgentWorkflow).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      payload,
      'org-1',
    )
  })

  it('updates agent workflows from /agents/:agentKey/workflows/:workflowId', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeWorkflowsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: null, orgRole: null }

    await expect(
      controller.updateAgentWorkflow(
        user,
        supabase,
        'copywriter',
        'workflow-1',
        { name: 'Draft' },
        scope,
      ),
    ).resolves.toEqual({ id: 'workflow-1', name: 'Draft' })
    expect(agentOperations.updateAgentWorkflow).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'workflow-1',
      { name: 'Draft' },
      null,
    )
  })

  it('deletes agent workflows from /agents/:agentKey/workflows/:workflowId', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeWorkflowsController(agentOperations)
    const supabase = {} as never
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: null, orgRole: null }

    await expect(
      controller.deleteAgentWorkflow(user, supabase, 'copywriter', 'workflow-1', scope),
    ).resolves.toEqual({ deleted: true })
    expect(agentOperations.deleteAgentWorkflow).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'workflow-1',
      null,
    )
  })
})

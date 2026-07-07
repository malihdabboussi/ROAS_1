import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepositoryAgentDefinitionsBase } from './missions-repository-agent-definitions.base'
import type { CreateAgentWorkflowInput } from './missions-repository.shared'

export abstract class MissionsRepositoryWorkflowsBase extends MissionsRepositoryAgentDefinitionsBase {
  async listAgentWorkflows(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    let wfQ = supabase
      .from('agent_workflows')
      .select('*')
      .eq('agent_key', agentKey)
      .order('created_at', { ascending: true })
    if (orgId) {
      wfQ = wfQ.or(`org_id.eq.${orgId},org_id.is.null`).is('user_id', null)
    } else {
      wfQ = wfQ.or(`user_id.eq.${userId},user_id.is.null`).is('org_id', null)
    }
    const { data, error } = await wfQ
    if (error) throw new Error(`Failed to list agent workflows: ${error.message}`)
    if (!data?.length) return []

    const hasArchetypeFilter = data.some(
      (row: Record<string, unknown>) =>
        Array.isArray(row.archetype_filter) && row.archetype_filter.length > 0,
    )
    if (!hasArchetypeFilter) return data

    let vibeyLookup2 = supabase.from('agents_registry').select('config').eq('agent_key', 'vibey')
    if (orgId) {
      vibeyLookup2 = vibeyLookup2.eq('org_id', orgId).is('user_id', null)
    } else {
      vibeyLookup2 = vibeyLookup2.eq('user_id', userId).is('org_id', null)
    }
    const { data: vibeyRow } = await vibeyLookup2.maybeSingle()
    const archetype =
      vibeyRow?.config && typeof vibeyRow.config === 'object' && !Array.isArray(vibeyRow.config)
        ? (vibeyRow.config as Record<string, unknown>).archetype
        : null
    const userArchetype = typeof archetype === 'string' ? archetype : null

    return data.filter((row: Record<string, unknown>) => {
      const filter = row.archetype_filter as string[] | null
      if (!filter || !Array.isArray(filter) || filter.length === 0) return true
      return userArchetype ? filter.includes(userArchetype) : false
    })
  }

  async createAgentWorkflow(supabase: SupabaseClient, input: CreateAgentWorkflowInput) {
    const { data, error } = await supabase
      .from('agent_workflows')
      .insert({
        user_id: input.org_id ? null : input.user_id,
        org_id: input.org_id ?? null,
        agent_key: input.agent_key,
        workflow_key: input.workflow_key,
        name: input.name,
        description: input.description,
        markdown_content: input.markdown_content,
        steps: input.steps,
        is_enabled: input.is_enabled ?? true,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create agent workflow: ${error.message}`)
    return data
  }

  async updateAgentWorkflow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    workflowId: string,
    updates: Partial<{
      workflow_key: string
      name: string
      description: string
      markdown_content: string
      steps: unknown[]
      is_enabled: boolean
    }>,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agent_workflows')
      .update(updates)
      .eq('id', workflowId)
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.select('*').single()
    if (error) throw new Error(`Failed to update agent workflow: ${error.message}`)
    return data
  }

  async deleteAgentWorkflow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    workflowId: string,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agent_workflows')
      .delete()
      .eq('id', workflowId)
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { error } = await query
    if (error) throw new Error(`Failed to delete agent workflow: ${error.message}`)
    return { deleted: true }
  }
}

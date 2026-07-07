import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepositorySkillResourcesBase } from './missions-repository-skill-resources.base'

export abstract class MissionsRepositoryAgentLifecycleBase extends MissionsRepositorySkillResourcesBase {
  async renameAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    name: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('agents_registry').update({ name }).eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.select('*').single()
    if (error) throw new Error(`Failed to rename agent: ${error.message}`)
    return data
  }

  async fireEmployee(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    const normalizedAgentKey = agentKey.toLowerCase().replace(/[^a-z0-9_]/g, '_')

    let targetQ = supabase
      .from('agents_registry')
      .select('agent_key, level')
      .eq('agent_key', normalizedAgentKey)
    if (orgId) {
      targetQ = targetQ.eq('org_id', orgId).is('user_id', null)
    } else {
      targetQ = targetQ.eq('user_id', userId).is('org_id', null)
    }
    const { data: target, error: targetError } = await targetQ.maybeSingle()
    if (targetError) throw new Error(`Failed to load target agent: ${targetError.message}`)
    if (!target) throw new Error('Agent not found')
    if (target.level === 'system' || target.level === 'c_level') {
      throw new Error('Only employees and managers can be removed')
    }
    if (target.level !== 'employee' && target.level !== 'manager') {
      throw new Error('Only employees and managers can be removed')
    }

    let leadersQ = supabase
      .from('agents_registry')
      .select('agent_key, level, created_at')
      .in('level', ['c_level', 'manager'])
      .neq('agent_key', normalizedAgentKey)
      .order('created_at', { ascending: true })
    if (orgId) {
      leadersQ = leadersQ.eq('org_id', orgId).is('user_id', null)
    } else {
      leadersQ = leadersQ.eq('user_id', userId).is('org_id', null)
    }
    const { data: leaderCandidates, error: leadersError } = await leadersQ
    if (leadersError)
      throw new Error(`Failed to resolve reassignment leader: ${leadersError.message}`)

    const preferredLeader =
      (leaderCandidates ?? []).find((row) => row.level === 'c_level') ??
      (leaderCandidates ?? []).find((row) => row.level === 'manager')
    const managerKey =
      typeof preferredLeader?.agent_key === 'string' ? preferredLeader.agent_key : ''
    if (!managerKey) throw new Error('No valid leader available for reassignment')

    const activeMissionStatuses = [
      'inbox',
      'backlog',
      'planning',
      'todo',
      'in_progress',
      'review',
      'blocked',
      'error',
      'failed',
      'dead_letter',
    ]

    const { error: reassignAssignedError } = await supabase
      .from('missions')
      .update({ assigned_agent_key: managerKey, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('assigned_agent_key', normalizedAgentKey)
      .in('status', activeMissionStatuses)
    if (reassignAssignedError) {
      throw new Error(`Failed to reassign mission owners: ${reassignAssignedError.message}`)
    }

    const { error: reassignCurrentError } = await supabase
      .from('missions')
      .update({ current_agent_key: managerKey, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('current_agent_key', normalizedAgentKey)
      .in('status', activeMissionStatuses)
    if (reassignCurrentError) {
      throw new Error(`Failed to reassign active missions: ${reassignCurrentError.message}`)
    }

    // Only rewrite agent-assigned subtasks. Human rows live on assigned_user_id and must
    // not be touched when an agent is deleted.
    const { error: reassignSubtasksError } = await supabase
      .from('mission_subtasks')
      .update({ assigned_agent_key: managerKey, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('assignee_type', 'agent')
      .eq('assigned_agent_key', normalizedAgentKey)
      .in('status', ['pending', 'in_progress', 'revision', 'blocked'])
    if (reassignSubtasksError) {
      throw new Error(`Failed to reassign subtasks: ${reassignSubtasksError.message}`)
    }

    const { error: deleteCampaignAssignmentsError } = await supabase
      .from('campaign_agents')
      .delete()
      .eq('user_id', userId)
      .eq('agent_key', normalizedAgentKey)
    if (deleteCampaignAssignmentsError) {
      throw new Error(
        `Failed to remove campaign assignments: ${deleteCampaignAssignmentsError.message}`,
      )
    }

    let deleteDefs = supabase.from('agent_definitions').delete().eq('agent_key', normalizedAgentKey)
    if (orgId) {
      deleteDefs = deleteDefs.eq('org_id', orgId).is('user_id', null)
    } else {
      deleteDefs = deleteDefs.eq('user_id', userId).is('org_id', null)
    }
    const { error: deleteDefinitionsError } = await deleteDefs
    if (deleteDefinitionsError) {
      throw new Error(`Failed to remove agent definitions: ${deleteDefinitionsError.message}`)
    }

    let deleteSkills = supabase.from('agent_skills').delete().eq('agent_key', normalizedAgentKey)
    if (orgId) {
      deleteSkills = deleteSkills.eq('org_id', orgId).is('user_id', null)
    } else {
      deleteSkills = deleteSkills.eq('user_id', userId).is('org_id', null)
    }
    const { error: deleteSkillsError } = await deleteSkills
    if (deleteSkillsError) {
      throw new Error(`Failed to remove agent skills: ${deleteSkillsError.message}`)
    }

    let deleteAgentQ = supabase.from('agents_registry').delete().eq('agent_key', normalizedAgentKey)
    if (orgId) {
      deleteAgentQ = deleteAgentQ.eq('org_id', orgId).is('user_id', null)
    } else {
      deleteAgentQ = deleteAgentQ.eq('user_id', userId).is('org_id', null)
    }
    const { error: deleteAgentError } = await deleteAgentQ
    if (deleteAgentError) throw new Error(`Failed to remove agent: ${deleteAgentError.message}`)

    return { deleted: true, reassigned_to: managerKey }
  }

  async cleanupAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    const tables = [
      'agent_skill_resources',
      'agent_skills',
      'agent_definitions',
      'agents_registry',
    ] as const
    for (const table of tables) {
      let q = supabase.from(table).delete().eq('agent_key', agentKey)
      if (orgId) {
        q = q.eq('org_id', orgId).is('user_id', null)
      } else {
        q = q.eq('user_id', userId).is('org_id', null)
      }
      await q
    }
  }
}

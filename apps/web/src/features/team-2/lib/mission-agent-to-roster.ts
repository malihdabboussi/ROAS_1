import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

export function missionAgentToRosterEntry(agent: MissionAgent): TeamRosterEntry {
  return {
    participant_id: `agent:${agent.agent_key}`,
    kind: 'agent',
    org_id: null,
    user_id: null,
    agent_key: agent.agent_key,
    display_name: agent.name,
    avatar_url: agent.image_url ?? null,
    role_label: agent.role?.trim() || null,
    specialties: agent.specialty ? [agent.specialty] : [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: agent.level ?? null,
    org_role: null,
    email: null,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
  }
}

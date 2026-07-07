import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepository } from '../repositories/missions.repository'

type MissionSubtaskSummary = {
  total: number
  done: number
}

@Injectable()
export class MissionListSummaryService {
  constructor(private readonly missionsRepository: MissionsRepository = new MissionsRepository()) {}

  async appendSubtaskSummaries<T extends Record<string, unknown>>(
    supabase: SupabaseClient,
    missions: T[],
  ) {
    const missionIds = missions.map((mission) => String(mission.id))
    const subtaskRows = await this.missionsRepository.listSubtaskSummaryRows(supabase, missionIds)

    const countMap: Record<string, MissionSubtaskSummary> = {}
    const agentMap: Record<string, Set<string>> = {}
    for (const row of subtaskRows) {
      const subtask = row as {
        mission_id: string
        status: string
        assigned_agent_key: string | null
      }
      if (!countMap[subtask.mission_id]) countMap[subtask.mission_id] = { total: 0, done: 0 }
      countMap[subtask.mission_id].total += 1
      if (subtask.status === 'done') countMap[subtask.mission_id].done += 1
      if (subtask.assigned_agent_key) {
        if (!agentMap[subtask.mission_id]) agentMap[subtask.mission_id] = new Set()
        agentMap[subtask.mission_id].add(subtask.assigned_agent_key)
      }
    }

    return missions.map((mission) => {
      const missionId = String(mission.id)
      const assignedAgentKey =
        typeof mission.assigned_agent_key === 'string' ? mission.assigned_agent_key : null
      const keys = new Set(agentMap[missionId] ?? [])
      if (assignedAgentKey) keys.add(assignedAgentKey)
      return {
        ...mission,
        subtask_total: countMap[missionId]?.total ?? 0,
        subtask_done: countMap[missionId]?.done ?? 0,
        subtask_agent_keys: Array.from(keys),
      }
    })
  }
}

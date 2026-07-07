'use client'

import { fetchMissionAgents } from '@/features/mission-control/services/missions.service'
import type { MissionAgent } from '@/features/mission-control/types'

export type ProjectAgent = MissionAgent

export async function listProjectAgents(): Promise<ProjectAgent[]> {
  return fetchMissionAgents()
}

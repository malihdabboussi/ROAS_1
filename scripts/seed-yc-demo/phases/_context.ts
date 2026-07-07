/**
 * Shared phase context — every phase handler receives this. Earlier phases
 * mutate `state`; later phases consume what's been populated.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApiClient } from '../lib/api'
import type { SeederEnv } from '../lib/env'
import type { Ids } from '../lib/ids'
import type { Logger } from '../lib/log'
import type * as timelineHelpers from '../lib/timeline'

export interface PhaseContext {
  env: SeederEnv
  supabase: SupabaseClient
  api: ApiClient
  log: Logger
  ids: Ids
  timeline: typeof timelineHelpers
  /** Print intended INSERTs, do not commit. */
  dryRun: boolean
  /** Tear down the demo org first if it exists, then re-seed. */
  reset: boolean
  state: PhaseState
}

/** Cross-phase shared state. Populated as phases run. */
export interface PhaseState {
  // Populated by P1
  founderUserId?: string
  founderEmail?: string
  founderPassword?: string
  nicoUserId?: string
  julesUserId?: string
  orgId?: string
  defaultUserBrainId?: string

  // Populated by P2
  companyBrainId?: string
  customerBrainId?: string
  /** agent_key → ns_brains.id for the agent brain. */
  agentBrainIds?: Record<string, string>

  // Populated by P3a / P3b1
  /** contact slug → contacts.id */
  contactIds?: Record<string, string>
  /** avatar slug → customer_avatars.id */
  customerAvatarIds?: Record<string, string>

  // Populated by P4
  hiredAgentKeys?: string[]
  /** team slug ('brand'|'growth'|'delivery'|'ops') → agent_teams.id */
  agentTeamIds?: Record<string, string>

  // Populated by P5
  /** campaign slug → campaigns.id */
  campaignIds?: Record<string, string>
  /** campaign slug → ns_brains.id (campaign brain) */
  campaignBrainIds?: Record<string, string>

  // Populated by P6
  /** space slug → spaces.id */
  spaceIds?: Record<string, string>
  /** space slug → channels.id (the in-space channel) */
  spaceChannelIds?: Record<string, string>

  // Populated by P7
  /** mission slug → missions.id */
  missionIds?: Record<string, string>

  // Populated by P7.5
  /** table name → slug → row id */
  artifactIds?: Record<string, Record<string, string>>
  /** marketing avatar slug → avatars.id */
  marketingAvatarIds?: Record<string, string>
}

export interface PhaseResult {
  phaseId: string
  rowCounts: Record<string, number>
  warnings: string[]
  durationMs: number
}

export type PhaseHandler = (ctx: PhaseContext) => Promise<PhaseResult>

export interface PhaseDefinition {
  id: string
  name: string
  description: string
  handler: PhaseHandler
}

/** Helper: produce a PhaseResult skeleton with timing. */
export function startResult(phaseId: string): {
  finish: (rows: Record<string, number>, warnings?: string[]) => PhaseResult
} {
  const t0 = Date.now()
  return {
    finish(rows, warnings = []) {
      return {
        phaseId,
        rowCounts: rows,
        warnings,
        durationMs: Date.now() - t0,
      }
    },
  }
}

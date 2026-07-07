import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { isSystemAgentKey } from '../../missions/lib/system-agent-keys'
import { OrgAgentImportRepository } from '../repositories/org-agent-import.repository'

export interface ImportResult {
  agentKey: string
  agentId: string
  skillsImported: number
  skillResourcesImported: number
  definitionsImported: number
  brainImported: boolean
  brainId: string | null
}

@Injectable()
export class OrgAgentImportService {
  private readonly logger = new Logger(OrgAgentImportService.name)
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: OrgAgentImportRepository = new OrgAgentImportRepository(),
  ) {
    this.supabase = svc.client
  }

  async importAgents(
    orgId: string,
    userId: string,
    agentKeys: string[],
    includeBrains: boolean,
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = []

    for (const agentKey of agentKeys) {
      const result = await this.importSingleAgent(orgId, userId, agentKey, includeBrains)
      if (result) results.push(result)
    }

    return results
  }

  private async importSingleAgent(
    orgId: string,
    userId: string,
    agentKey: string,
    includeBrain: boolean,
  ): Promise<ImportResult | null> {
    const sourceAgent = await this.repository.findPersonalAgent(this.supabase, userId, agentKey)

    if (!sourceAgent) {
      this.logger.warn(`Agent ${agentKey} not found for user ${userId}`)
      return null
    }

    const existing = await this.repository.findOrgAgent(this.supabase, orgId, agentKey)

    if (existing) {
      this.logger.warn(`Agent ${agentKey} already exists in org ${orgId}`)
      return null
    }

    const { id: _id, created_at: _ca, updated_at: _ua, ...agentData } = sourceAgent
    const { data: newAgent, error: agentErr } = await this.repository.insertImportedAgent(
      this.supabase,
      { ...agentData, org_id: orgId, user_id: null, created_by: userId },
    )
    if (agentErr || !newAgent) {
      this.logger.error(`Failed to import agent ${agentKey}: ${agentErr?.message}`)
      return null
    }

    const skillsImported = await this.duplicateAgentSkills(orgId, userId, agentKey)
    const skillResourcesImported = await this.duplicateAgentSkillResources(orgId, userId, agentKey)
    const definitionsImported = await this.duplicateAgentDefinitions(orgId, userId, agentKey)

    let brainImported = false
    let brainId: string | null = null

    if (includeBrain) {
      const brainResult = await this.duplicateAgentBrain(orgId, userId, agentKey)
      brainImported = brainResult.imported
      brainId = brainResult.brainId
    }

    this.logger.log(
      `Imported agent ${agentKey} to org ${orgId}: skills=${skillsImported}, resources=${skillResourcesImported}, defs=${definitionsImported}, brain=${brainImported}`,
    )

    return {
      agentKey,
      agentId: String(newAgent.id),
      skillsImported,
      skillResourcesImported,
      definitionsImported,
      brainImported,
      brainId,
    }
  }

  private async duplicateAgentSkills(
    orgId: string,
    userId: string,
    agentKey: string,
  ): Promise<number> {
    if (isSystemAgentKey(agentKey)) return 0
    const skills = await this.repository.listPersonalAgentSkills(this.supabase, userId, agentKey)
    if (!skills?.length) return 0

    const copies = skills.map((s: any) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = s
      return { ...rest, org_id: orgId, user_id: null }
    })
    const error = await this.repository.insertAgentSkills(this.supabase, copies)
    if (error) this.logger.warn(`Failed to copy skills for ${agentKey}: ${error.message}`)
    return copies.length
  }

  private async duplicateAgentSkillResources(
    orgId: string,
    userId: string,
    agentKey: string,
  ): Promise<number> {
    if (isSystemAgentKey(agentKey)) return 0
    const resources = await this.repository.listPersonalAgentSkillResources(
      this.supabase,
      userId,
      agentKey,
    )
    if (!resources?.length) return 0

    const copies = resources.map((r: any) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = r
      return { ...rest, org_id: orgId, user_id: null }
    })
    const error = await this.repository.insertAgentSkillResources(this.supabase, copies)
    if (error) this.logger.warn(`Failed to copy skill resources for ${agentKey}: ${error.message}`)
    return copies.length
  }

  private async duplicateAgentDefinitions(
    orgId: string,
    userId: string,
    agentKey: string,
  ): Promise<number> {
    if (isSystemAgentKey(agentKey)) return 0
    const defs = await this.repository.listPersonalAgentDefinitions(this.supabase, userId, agentKey)
    if (!defs?.length) return 0

    const copies = defs.map((d: any) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = d
      return { ...rest, org_id: orgId, user_id: null }
    })
    const error = await this.repository.insertAgentDefinitions(this.supabase, copies)
    if (error) this.logger.warn(`Failed to copy definitions for ${agentKey}: ${error.message}`)
    return copies.length
  }

  private async duplicateAgentBrain(
    orgId: string,
    userId: string,
    agentKey: string,
  ): Promise<{ imported: boolean; brainId: string | null }> {
    const sourceBrain = await this.repository.findPersonalAgentBrain(this.supabase, userId, agentKey)

    if (!sourceBrain) return { imported: false, brainId: null }

    const {
      id: brainId,
      created_at: _bca,
      updated_at: _bua,
      pending_deletion_at: _pda,
      ...brainData
    } = sourceBrain
    const { data: newBrain, error: brainErr } = await this.repository.insertImportedBrain(
      this.supabase,
      { ...brainData, org_id: orgId, owner_id: userId, created_by: userId },
    )

    if (brainErr || !newBrain) {
      this.logger.warn(`Failed to copy brain for ${agentKey}: ${brainErr?.message}`)
      return { imported: false, brainId: null }
    }

    const newBrainId = String(newBrain.id)

    const memories = await this.repository.listBrainMemories(this.supabase, String(brainId))
    if (memories?.length) {
      const memoryCopies = memories.map((m: any) => {
        const { id: _mid, created_at: _mca, updated_at: _mua, ...rest } = m
        return { ...rest, brain_id: newBrainId }
      })
      await this.repository.insertBrainMemories(this.supabase, memoryCopies)
    }

    const skEntries = await this.repository.listBrainSkEntries(this.supabase, String(brainId))
    if (skEntries?.length) {
      const skCopies = skEntries.map((e: any) => {
        const { id: _eid, created_at: _eca, updated_at: _eua, source_id: _sid, ...rest } = e
        return { ...rest, brain_id: newBrainId, source_id: null }
      })
      await this.repository.insertBrainSkEntries(this.supabase, skCopies)
    }

    const snapshots = await this.repository.listBrainSnapshots(this.supabase, String(brainId))
    if (snapshots?.length) {
      const snapCopies = snapshots.map((s: any) => {
        const { id: _sid, created_at: _sca, updated_at: _sua, ...rest } = s
        return { ...rest, brain_id: newBrainId }
      })
      await this.repository.insertBrainSnapshots(this.supabase, snapCopies)
    }

    this.logger.log(
      `Duplicated brain for ${agentKey}: ${memories?.length ?? 0} memories, ${skEntries?.length ?? 0} sk_entries, ${snapshots?.length ?? 0} snapshots`,
    )

    return { imported: true, brainId: newBrainId }
  }
}

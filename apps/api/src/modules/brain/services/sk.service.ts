import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { SkRepository } from '../repositories/sk.repository'
import type { BrainPermissionsService } from './brain-permissions.service'
import { EmbeddingService } from './embedding.service'

@Injectable()
export class SkService {
  constructor(
    private readonly embedding: EmbeddingService,
    private readonly skRepository: SkRepository,
  ) {}

  async search(
    supabase: SupabaseClient,
    userId: string,
    input: { query: string; brainId: string; limit?: number; orgId?: string | null },
  ) {
    const brain = await this.skRepository.findBrainById(supabase, input.brainId)
    if (!brain) throw new Error('Brain not found')

    const embedding = await this.embedding.getEmbedding(input.query, {
      taskType: 'RETRIEVAL_QUERY',
      billing: { userId, orgId: input.orgId },
    })
    if (!embedding) return []

    const results = await this.skRepository.searchEntries(supabase, {
      brainId: input.brainId,
      embedding,
      limit: input.limit ?? 10,
    })
    if (results.length === 0) {
      await this.skRepository.createGap(supabase, input.brainId, input.query)
    }
    return results
  }

  async getSources(supabase: SupabaseClient, userId: string, brainId: string) {
    const brain = await this.skRepository.findBrainById(supabase, brainId)
    if (!brain) throw new Error('Brain not found')

    return this.skRepository.findSources(supabase, brainId)
  }

  async getGaps(supabase: SupabaseClient, userId: string, brainId: string) {
    const brain = await this.skRepository.findBrainById(supabase, brainId)
    if (!brain) throw new Error('Brain not found')

    return this.skRepository.findGaps(supabase, brainId)
  }

  async getStats(supabase: SupabaseClient, userId: string, brainId: string) {
    const brain = await this.skRepository.findBrainById(supabase, brainId)
    if (!brain) throw new Error('Brain not found')

    const data = await this.skRepository.getEntryStats(supabase, brainId)

    const payload = (data ?? {}) as {
      totalEntries?: number | string
      avgMastery?: number | string
      domainBreakdown?: Record<string, number | string>
    }

    const domainBreakdown: Record<string, number> = {}
    for (const [domain, count] of Object.entries(payload.domainBreakdown ?? {})) {
      domainBreakdown[domain] = Number(count)
    }

    return {
      totalEntries: Number(payload.totalEntries ?? 0),
      avgMastery: Number(payload.avgMastery ?? 0),
      domainBreakdown,
    }
  }

  async deleteEntry(supabase: SupabaseClient, userId: string, entryId: string) {
    const entry = await this.skRepository.findEntryForDelete(supabase, entryId)

    const brain = await this.skRepository.findBrainById(supabase, String(entry.brain_id))
    if (!brain) throw new Error('Brain not found')

    await this.skRepository.deleteEntry(supabase, entryId)

    if (entry.content_hash) {
      const remaining = await this.skRepository.hasEntryWithContentHash(
        supabase,
        String(entry.brain_id),
        String(entry.content_hash),
      )
      if (!remaining) {
        await this.skRepository.deleteContentHash(
          supabase,
          String(entry.brain_id),
          String(entry.content_hash),
        )
      }
    }
    return { success: true }
  }

  async deleteEntryWithTrainingPermission(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    entryId: string,
    brainPermissions: BrainPermissionsService,
  ) {
    const brainId = await this.skRepository.findEntryBrainId(supabase, entryId)
    if (!brainId) throw new BadRequestException('Entry not found')
    await brainPermissions.assertCanTrainBrain(supabase, userId, scope, brainId)
    return this.deleteEntry(supabase, userId, entryId)
  }

  async deleteSource(supabase: SupabaseClient, userId: string, sourceId: string) {
    const source = await this.skRepository.findSourceForDelete(supabase, sourceId)

    const brain = await this.skRepository.findBrainById(supabase, String(source.brain_id))
    if (!brain) throw new Error('Brain not found')

    const entries = await this.skRepository.findEntriesForSource(supabase, sourceId)
    const deletedEntries = entries?.length ?? 0
    const contentHashesToCheck = [
      ...new Set((entries ?? []).map((e) => e.content_hash).filter(Boolean)),
    ]

    if (deletedEntries > 0) {
      await this.skRepository.deleteEntriesForSource(supabase, sourceId)

      for (const hash of contentHashesToCheck) {
        const remaining = await this.skRepository.hasEntryWithContentHash(
          supabase,
          String(source.brain_id),
          String(hash),
        )
        if (!remaining) {
          await this.skRepository.deleteContentHash(supabase, String(source.brain_id), String(hash))
        }
      }
    }

    await this.skRepository.deleteSource(supabase, sourceId)

    return { success: true, deletedEntries }
  }

  async deleteSourceWithTrainingPermission(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    sourceId: string,
    brainPermissions: BrainPermissionsService,
  ) {
    const brainId = await this.skRepository.findSourceBrainId(supabase, sourceId)
    if (!brainId) throw new BadRequestException('Source not found')
    await brainPermissions.assertCanTrainBrain(supabase, userId, scope, brainId)
    return this.deleteSource(supabase, userId, sourceId)
  }

  async updateMastery(supabase: SupabaseClient, userId: string, entryId: string, score: number) {
    const entry = await this.skRepository.findEntryForMastery(supabase, entryId)

    const brain = await this.skRepository.findBrainById(supabase, String(entry.brain_id))
    if (!brain) throw new Error('Brain not found')

    return this.skRepository.updateMastery(supabase, entryId, score)
  }

  async updateMasteryWithTrainingPermission(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    entryId: string,
    score: number,
    brainPermissions: BrainPermissionsService,
  ) {
    const brainId = await this.skRepository.findEntryBrainId(supabase, entryId)
    if (!brainId) throw new BadRequestException('Entry not found')
    await brainPermissions.assertCanTrainBrain(supabase, userId, scope, brainId)
    return this.updateMastery(supabase, userId, entryId, score)
  }
}

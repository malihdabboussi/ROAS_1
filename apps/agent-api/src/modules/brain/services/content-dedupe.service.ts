import { createHash } from 'crypto'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainRuntimeRepository } from '../repositories/brain-runtime.repository'

@Injectable()
export class ContentDedupeService {
  constructor(private readonly repository: BrainRuntimeRepository = new BrainRuntimeRepository()) {}

  private normalize(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase()
  }

  private hash(value: string): string {
    return createHash('sha256').update(this.normalize(value)).digest('hex')
  }

  private async resolveDefaultBrainId(client: SupabaseClient, ownerId: string): Promise<string> {
    const { data: existing } = await this.repository.findDefaultUserBrainId(client, ownerId)
    if (existing?.id) return existing.id

    const { data: created, error } = await this.repository.createDefaultUserBrain(client, ownerId)
    if (created?.id) return created.id

    if (error) {
      const { data: fallback } = await this.repository.findDefaultUserBrainId(client, ownerId)
      if (fallback?.id) return fallback.id
    }

    throw new Error('Failed creating or finding default brain')
  }

  async registerForBrain(
    client: SupabaseClient,
    brainId: string,
    content: string,
    sourceType: string,
  ): Promise<{ duplicate: boolean; contentHash: string }> {
    const contentHash = this.hash(content)
    const { data: existing } = await this.repository.findContentHash(client, {
      brainId,
      contentHash,
    })
    if (existing?.id) return { duplicate: true, contentHash }

    const error = await this.repository.insertContentHash(client, {
      brainId,
      contentHash,
      sourceType,
    })
    if (error) {
      if ((error as { code?: string }).code === '23505') return { duplicate: true, contentHash }
      throw new Error(`DB error: ${error.message}`)
    }

    return { duplicate: false, contentHash }
  }

  async registerForOwner(
    client: SupabaseClient,
    ownerId: string,
    content: string,
    sourceType: string,
  ): Promise<{ duplicate: boolean; contentHash: string }> {
    const brainId = await this.resolveDefaultBrainId(client, ownerId)
    return this.registerForBrain(client, brainId, content, sourceType)
  }
}

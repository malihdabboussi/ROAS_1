import { createHash } from 'crypto'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ContentDedupeRepository } from '../repositories/content-dedupe.repository'

@Injectable()
export class ContentDedupeService {
  constructor(private readonly contentDedupeRepository: ContentDedupeRepository) {}

  private normalize(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase()
  }

  private hash(value: string): string {
    return createHash('sha256').update(this.normalize(value)).digest('hex')
  }

  private async resolveDefaultBrainId(
    _client: SupabaseClient,
    ownerId: string,
    _orgId?: string | null,
  ): Promise<string> {
    return this.contentDedupeRepository.resolveDefaultBrainId(ownerId)
  }

  async registerForBrain(
    client: SupabaseClient,
    brainId: string,
    content: string,
    sourceType: string,
  ): Promise<{ duplicate: boolean; contentHash: string }> {
    const contentHash = this.hash(content)
    const existing = await this.contentDedupeRepository.findContentHash(
      client,
      brainId,
      contentHash,
    )
    if (existing?.id) return { duplicate: true, contentHash }

    const { error } = await this.contentDedupeRepository.insertContentHash(client, {
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
    orgId?: string | null,
  ): Promise<{ duplicate: boolean; contentHash: string }> {
    const brainId = await this.resolveDefaultBrainId(client, ownerId, orgId)
    return this.registerForBrain(client, brainId, content, sourceType)
  }
}

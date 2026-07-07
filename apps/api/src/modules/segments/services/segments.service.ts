import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateSegmentInput, UpdateSegmentInput } from '../dto'
import { SegmentsRepository } from '../repositories/segments.repository'
import type { Segment } from '../types/segment.types'

@Injectable()
export class SegmentsService {
  private readonly logger = new Logger(SegmentsService.name)

  constructor(private readonly repository: SegmentsRepository) {}

  async getFilterOptions(supabase: SupabaseClient): Promise<{
    tags: string[]
    countries: string[]
  }> {
    return this.repository.getFilterOptions(supabase)
  }

  async getSegments(
    supabase: SupabaseClient,
    orgId?: string | null,
  ): Promise<{ segments: Segment[] }> {
    const segments = await this.repository.findByUserId(supabase, orgId)
    return { segments }
  }

  async getSegment(
    supabase: SupabaseClient,
    segmentId: string,
    orgId?: string | null,
  ): Promise<Segment> {
    const segment = await this.repository.findById(supabase, segmentId, orgId)
    if (!segment) {
      throw new NotFoundException('Segment not found')
    }
    return segment
  }

  async createSegment(
    supabase: SupabaseClient,
    userId: string,
    input: CreateSegmentInput,
    orgId?: string | null,
  ): Promise<Segment> {
    this.logger.log(`Creating segment: ${input.name}`)

    const segment = await this.repository.create(
      supabase,
      userId,
      {
        name: input.name,
        description: input.description,
        filters: input.filters,
      },
      orgId,
    )

    return segment
  }

  async updateSegment(
    supabase: SupabaseClient,
    segmentId: string,
    input: UpdateSegmentInput,
    orgId?: string | null,
  ): Promise<Segment> {
    const existing = await this.repository.findById(supabase, segmentId, orgId)
    if (!existing) {
      throw new NotFoundException('Segment not found')
    }

    const segment = await this.repository.update(supabase, segmentId, input, orgId)
    return segment
  }

  async previewSegment(
    supabase: SupabaseClient,
    filters: Record<string, unknown>,
  ): Promise<number> {
    try {
      return await this.repository.previewSegmentContacts(supabase, filters)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Preview RPC failed: ${message}`)
      throw error
    }
  }

  async deleteSegment(
    supabase: SupabaseClient,
    segmentId: string,
    orgId?: string | null,
  ): Promise<{ success: boolean }> {
    const existing = await this.repository.findById(supabase, segmentId, orgId)
    if (!existing) {
      throw new NotFoundException('Segment not found')
    }

    await this.repository.delete(supabase, segmentId, orgId)
    this.logger.log(`Segment deleted: ${segmentId}`)
    return { success: true }
  }
}

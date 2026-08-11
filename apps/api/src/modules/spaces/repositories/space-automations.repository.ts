import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateAutomationDto, UpdateAutomationDto } from '../dto'

type SpaceAutomationPatch = UpdateAutomationDto & {
  created_by?: string
  updated_at?: string
}

@Injectable()
export class SpaceAutomationsRepository {
  async listBySpace(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('space_automations')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async listBySpaces(supabase: SupabaseClient, spaceIds: string[]) {
    if (spaceIds.length === 0) return []
    const { data, error } = await supabase
      .from('space_automations')
      .select('*')
      .in('space_id', spaceIds)
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async listFlowsForOrg(
    supabase: SupabaseClient,
    orgId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ) {
    let query = supabase
      .from('space_automations')
      .select('*, spaces!inner(id, title, campaign_id, org_id)')
      .eq('spaces.org_id', orgId)

    if (filters.spaceId) query = query.eq('space_id', filters.spaceId)
    if (filters.campaignId) query = query.eq('spaces.campaign_id', filters.campaignId)

    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async findById(supabase: SupabaseClient, spaceId: string, automationId: string) {
    const { data, error } = await supabase
      .from('space_automations')
      .select('*')
      .eq('space_id', spaceId)
      .eq('id', automationId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async create(
    supabase: SupabaseClient,
    space: { id: string; user_id: string; org_id?: string | null },
    createdBy: string,
    dto: CreateAutomationDto,
  ) {
    const isDraft = 'is_draft' in dto && dto.is_draft === true
    const name =
      isDraft && typeof dto.name === 'string' && !dto.name.trim() ? 'Untitled draft' : dto.name
    const { data, error } = await supabase
      .from('space_automations')
      .insert({
        space_id: space.id,
        user_id: space.user_id,
        org_id: space.org_id ?? null,
        created_by: createdBy,
        ...dto,
        name,
        is_draft: isDraft,
        enabled: isDraft ? false : (dto.enabled ?? true),
      })
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async update(
    supabase: SupabaseClient,
    spaceId: string,
    automationId: string,
    patch: SpaceAutomationPatch,
    opts?: { expectedUpdatedAt?: string },
  ) {
    let query = supabase
      .from('space_automations')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('space_id', spaceId)
      .eq('id', automationId)

    if (opts?.expectedUpdatedAt) {
      query = query.eq('updated_at', opts.expectedUpdatedAt)
    }

    const { data, error } = await query.select().maybeSingle()
    if (error) throw new BadRequestException(error.message)
    if (!data) {
      if (opts?.expectedUpdatedAt) {
        throw new ConflictException(
          'Automation was modified by another request — please reload and try again',
        )
      }
      throw new BadRequestException('Automation not found')
    }
    return data
  }

  async delete(supabase: SupabaseClient, spaceId: string, automationId: string) {
    const { error } = await supabase
      .from('space_automations')
      .delete()
      .eq('space_id', spaceId)
      .eq('id', automationId)
    if (error) throw new BadRequestException(error.message)
    return { deleted: true }
  }

  /**
   * Update only the schedule materialized columns (`schedule_next_fire_at` /
   * `schedule_last_fired_at`). Pass `null` to clear a column.
   */
  async updateScheduleFields(
    supabase: SupabaseClient,
    spaceId: string,
    automationId: string,
    patch: { schedule_next_fire_at?: string | null; schedule_last_fired_at?: string | null },
  ) {
    if (patch.schedule_next_fire_at === undefined && patch.schedule_last_fired_at === undefined) {
      return null
    }
    const { error } = await supabase
      .from('space_automations')
      .update(patch)
      .eq('space_id', spaceId)
      .eq('id', automationId)
    if (error) throw new BadRequestException(error.message)
    return null
  }

  /**
   * Atomically advance `schedule_next_fire_at` from `expectedNextFireAt` to
   * `nextFireAt` and stamp `schedule_last_fired_at` to `firedAt`. Returns true
   * when this caller won the claim, false when another worker already advanced
   * the row (in which case the caller MUST NOT execute the actions).
   *
   * Two cron ticks (or two API instances) racing on the same due row only one
   * succeeds; the other gets `false` and skips. Removes the read-act-update
   * gap that previously allowed the same row to fire twice when actions ran
   * longer than the cron interval.
   */
  async claimSchedule(
    supabase: SupabaseClient,
    spaceId: string,
    automationId: string,
    expectedNextFireAt: string,
    nextFireAt: string,
    firedAt: string,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('space_automations')
      .update({ schedule_next_fire_at: nextFireAt, schedule_last_fired_at: firedAt })
      .eq('space_id', spaceId)
      .eq('id', automationId)
      .eq('schedule_next_fire_at', expectedNextFireAt)
      .select('id')
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return !!data
  }

  /**
   * Return enabled, non-draft automations whose `schedule_next_fire_at` is in
   * the past. Caller is responsible for rolling the column forward after each
   * fire (see {@link updateScheduleFields}).
   */
  async findDueSchedules(supabase: SupabaseClient, now: Date, limit: number) {
    const { data, error } = await supabase
      .from('space_automations')
      .select('*')
      .eq('enabled', true)
      .eq('is_draft', false)
      .not('schedule_next_fire_at', 'is', null)
      .lte('schedule_next_fire_at', now.toISOString())
      .order('schedule_next_fire_at', { ascending: true })
      .limit(limit)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async findSchedulesMissingNextFire(supabase: SupabaseClient, limit: number) {
    const { data, error } = await supabase
      .from('space_automations')
      .select('*')
      .eq('enabled', true)
      .eq('is_draft', false)
      .eq('trigger->>type', 'schedule')
      .is('schedule_next_fire_at', null)
      .order('updated_at', { ascending: true })
      .limit(limit)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async listPublishedWebhookAutomations(
    supabase: SupabaseClient,
    spaceId: string,
    webhookEndpointId: string,
  ) {
    const { data, error } = await supabase
      .from('space_automations')
      .select('*')
      .eq('space_id', spaceId)
      .eq('enabled', true)
      .eq('is_draft', false)
      .eq('trigger->>type', 'webhook_received')
      .eq('trigger->>webhook_endpoint_id', webhookEndpointId)
      .order('updated_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }
}

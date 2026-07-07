import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { CalendlyIntegration } from '../integrations/calendly.integration'
import type {
  CreateEventTypeInput,
  CreateOneOffEventTypeInput,
  CreateScheduledEventInput,
  UpdateEventTypeInput,
} from '../types/calendly.types'
import { CalendlyOAuthService } from './calendly-oauth.service'

@Injectable()
export class CalendlyApiService {
  constructor(
    private readonly calendly: CalendlyIntegration,
    private readonly oauth: CalendlyOAuthService,
    private readonly connections: IntegrationConnectionsRepository,
  ) {}

  // ── Event Types ──

  async listEventTypes(supabase: SupabaseClient, userId: string) {
    const { token, userUri } = await this.getTokenAndUserUri(supabase, userId)
    return this.calendly.listEventTypes(token, userUri)
  }

  async getEventType(supabase: SupabaseClient, userId: string, uuid: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.calendly.getEventType(token, uuid)
  }

  async createEventType(
    supabase: SupabaseClient,
    userId: string,
    input: Omit<CreateEventTypeInput, 'owner'>,
  ) {
    const { token, userUri } = await this.getTokenAndUserUri(supabase, userId)
    return this.calendly.createEventType(token, { ...input, owner: userUri })
  }

  async updateEventType(
    supabase: SupabaseClient,
    userId: string,
    uuid: string,
    input: UpdateEventTypeInput,
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.calendly.updateEventType(token, uuid, input)
  }

  async createOneOffEventType(
    supabase: SupabaseClient,
    userId: string,
    input: Omit<CreateOneOffEventTypeInput, 'host'>,
  ) {
    const { token, userUri } = await this.getTokenAndUserUri(supabase, userId)
    return this.calendly.createOneOffEventType(token, { ...input, host: userUri })
  }

  // ── Scheduled Events ──

  async listScheduledEvents(
    supabase: SupabaseClient,
    userId: string,
    params?: { min_start_time?: string; max_start_time?: string; status?: string },
  ) {
    const { token, userUri } = await this.getTokenAndUserUri(supabase, userId)
    return this.calendly.listScheduledEvents(token, userUri, params)
  }

  async createScheduledEvent(
    supabase: SupabaseClient,
    userId: string,
    input: CreateScheduledEventInput,
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.calendly.createScheduledEvent(token, input)
  }

  async cancelScheduledEvent(
    supabase: SupabaseClient,
    userId: string,
    uuid: string,
    reason?: string,
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.calendly.cancelScheduledEvent(token, uuid, reason)
  }

  // ── Available Times ──

  async listAvailableTimes(
    supabase: SupabaseClient,
    userId: string,
    eventTypeUri: string,
    startTime: string,
    endTime: string,
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.calendly.listAvailableTimes(token, eventTypeUri, startTime, endTime)
  }

  // ── Utility ──

  async getSchedulingUrl(
    supabase: SupabaseClient,
    userId: string,
    eventTypeUri: string,
  ): Promise<string | null> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    const uuid = eventTypeUri.split('/').pop()
    if (!uuid) return null
    const result = await this.calendly.getEventType(token, uuid)
    return result.resource.scheduling_url ?? null
  }

  private async getTokenAndUserUri(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ token: string; userUri: string }> {
    const token = await this.oauth.getAccessToken(supabase, userId)

    const data = await this.connections.getStatus(supabase, 'calendly', userId, null)

    const metadata = (data?.metadata as Record<string, unknown> | null) ?? {}
    const userUri = metadata.calendly_user_uri as string | undefined
    if (!userUri) {
      throw new Error('Calendly user URI not found in integration metadata')
    }
    return { token, userUri }
  }
}

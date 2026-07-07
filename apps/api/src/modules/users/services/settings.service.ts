import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { UsersRepository } from '../repositories/users.repository'

@Injectable()
export class SettingsService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getEmailSettings(user: { id: string }, supabase: SupabaseClient, scope: RequestScope) {
    const { data, error } = await this.usersRepository.getEmailSettings(
      supabase,
      user.id,
      scope.orgId ?? null,
    )
    if (error) throw new BadRequestException(error.message)
    return data ?? null
  }

  async putEmailSettings(
    user: { id: string },
    supabase: SupabaseClient,
    scope: RequestScope,
    body: {
      sending_days?: string[]
      sending_time_from?: string
      sending_time_until?: string
      sending_timezone?: string
      hide_branding?: boolean
      pause_on_reply?: boolean
      stop_keywords_enabled?: boolean
      stop_keywords?: string[]
      email_provider?: 'sendgrid' | 'ghl'
    },
  ) {
    const payload = {
      user_id: user.id,
      org_id: scope.orgId ?? null,
      sending_days: body.sending_days ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
      sending_time_from: body.sending_time_from ?? '09:00',
      sending_time_until: body.sending_time_until ?? '17:00',
      sending_timezone: body.sending_timezone ?? 'America/New_York',
      hide_branding: body.hide_branding ?? false,
      pause_on_reply: body.pause_on_reply ?? false,
      stop_keywords_enabled: body.stop_keywords_enabled ?? false,
      stop_keywords: body.stop_keywords ?? [],
      email_provider: body.email_provider ?? 'sendgrid',
    }

    const existing = await this.usersRepository.findEmailSettingsId(
      supabase,
      user.id,
      scope.orgId ?? null,
    )

    if (existing.error) throw new BadRequestException(existing.error.message)

    if (existing.data?.id) {
      const { data, error } = await this.usersRepository.updateEmailSettings(
        supabase,
        existing.data.id,
        payload,
      )
      if (error) throw new BadRequestException(error.message)
      return data
    }

    const { data, error } = await this.usersRepository.insertEmailSettings(supabase, payload)
    if (error) throw new BadRequestException(error.message)
    return data
  }
}

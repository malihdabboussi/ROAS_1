import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BroadcastSendPayload } from '../dto/email-campaigns.dto'
import { EmailCampaignsRepository } from '../repositories/email-campaigns.repository'

export interface BroadcastEmailSource {
  id: string
  subject: string
  body: string
}

export interface SequenceEmailSource {
  id: string
  subject: string
  body: string
  delay_hours: number
  order_index: number
}

export async function loadBroadcastEmailSource(
  repository: EmailCampaignsRepository,
  admin: SupabaseClient,
  payload: BroadcastSendPayload,
): Promise<BroadcastEmailSource> {
  const table = payload.email_id ? 'emails' : 'sequence_emails'
  const id = payload.email_id ?? payload.sequence_email_id
  if (!id) throw new BadRequestException('Email not found')

  const { data: email } = await repository
    .table(admin, table)
    .select('id, subject, body')
    .eq('id', id)
    .maybeSingle()

  if (!email) throw new BadRequestException('Email not found')
  return email as BroadcastEmailSource
}

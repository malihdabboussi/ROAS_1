import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { EMAIL_RE, sanitize } from './leads-controller-utils'
import { CONTACT_CHANNELS, isContactChannel } from '../services/contact-identifier.service'
import { LeadsService } from '../services/leads.service'

@Controller('leads')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class LeadContactImportsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('contacts/import-batch')
  @HttpCode(HttpStatus.OK)
  async importContactsBatch(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: { contacts?: unknown },
  ) {
    const raw = Array.isArray(body.contacts) ? body.contacts : []
    if (raw.length === 0) throw new BadRequestException('contacts array is required')
    if (raw.length > 5000) throw new BadRequestException('Maximum 5000 contacts per request')

    const items: Array<{
      email: string
      first_name: string | null
      last_name: string | null
      phone: string | null
      contact_source: string | null
      contact_source_detail: string | null
    }> = []

    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const email = typeof o.email === 'string' ? o.email.trim().toLowerCase() : ''
      if (!email || !EMAIL_RE.test(email)) continue
      const first_name = sanitize(o.first_name, 200) ?? null
      const last_name = sanitize(o.last_name, 200) ?? null
      const phone = sanitize(o.phone, 30) ?? null
      const contact_source = sanitize(o.contact_source, 200) ?? null
      if (contact_source !== null && !isContactChannel(contact_source)) {
        throw new BadRequestException(
          `contact_source must be one of: ${CONTACT_CHANNELS.join(', ')}`,
        )
      }
      const contact_source_detail = sanitize(o.contact_source_detail, 200) ?? null
      items.push({ email, first_name, last_name, phone, contact_source, contact_source_detail })
    }

    if (items.length === 0) throw new BadRequestException('No contacts with valid email addresses')
    return this.leadsService.importContactsBatch(supabase, user.id, items, scope.orgId)
  }

  @Post('contacts')
  @HttpCode(HttpStatus.CREATED)
  async createContact(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: Record<string, unknown>,
  ) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !EMAIL_RE.test(email)) throw new BadRequestException('Valid email is required')
    const first_name = sanitize(body.first_name, 200)
    const last_name = sanitize(body.last_name, 200)
    const phone = sanitize(body.phone, 30)
    return this.leadsService.createUserContact(
      supabase,
      user.id,
      {
        email,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        phone: phone ?? null,
      },
      scope.orgId,
    )
  }
}

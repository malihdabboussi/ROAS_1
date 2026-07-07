import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
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
import { UUID_RE } from './leads-controller-utils'
import { CONTACT_CHANNELS, isContactChannel } from '../services/contact-identifier.service'
import { LeadsService } from '../services/leads.service'

@Controller('leads')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class LeadContactsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('contacts')
  async listContacts(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.leadsService.getContacts(supabase, {
      search,
      sort,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      orgId: scope.orgId,
    })
  }

  @Get('contacts/basics')
  async getContactBasics(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('ids') ids?: string,
  ) {
    const parsed = (ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => UUID_RE.test(id))
      .slice(0, 100)
    return this.leadsService.getContactBasicsByIds(supabase, parsed, scope.orgId)
  }

  @Get('contacts/:id')
  async getContact(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    const contact = await this.leadsService.getContactById(supabase, id, scope.orgId)
    if (!contact) throw new NotFoundException('Contact not found')
    return contact
  }

  @Patch('contacts/:id')
  async updateContact(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const allowedFields = [
      'first_name',
      'last_name',
      'phone',
      'email',
      'tags',
      'custom_fields',
      'source',
      'business_name',
      'website',
      'address',
      'city',
      'state',
      'country',
      'contact_type',
      'contact_type_source',
      'contact_type_confidence',
      'contact_type_set_at',
      'contact_source',
      'contact_source_detail',
    ]
    const updates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key]
    }
    if (Object.keys(updates).length === 0) throw new BadRequestException('No valid fields to update')
    if (
      'contact_source' in updates &&
      updates.contact_source !== null &&
      !isContactChannel(updates.contact_source)
    ) {
      throw new BadRequestException(`contact_source must be one of: ${CONTACT_CHANNELS.join(', ')}`)
    }
    return this.leadsService.updateContact(supabase, id, updates, scope.orgId, user.id)
  }

  @Post('contacts/:id/reclassify')
  @HttpCode(HttpStatus.OK)
  async reclassifyContact(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: { new_contact_type?: string; confirmed?: boolean },
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    const newContactType =
      typeof body.new_contact_type === 'string' ? body.new_contact_type.trim() : ''
    if (!newContactType) throw new BadRequestException('new_contact_type is required')
    return this.leadsService.reclassifyContact(supabase, {
      contactId: id,
      newContactType,
      orgId: scope.orgId,
      actorUserId: user.id,
      confirmed: body.confirmed === true,
    })
  }
}

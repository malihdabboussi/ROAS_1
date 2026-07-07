import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { UUID_RE } from './leads-controller-utils'
import { LeadsService } from '../services/leads.service'

@Controller('leads')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class LeadContactTimelineController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('contacts/:id/activity')
  async getContactActivity(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    return this.leadsService.getContactActivity(supabase, id, scope.orgId)
  }

  @Get('contacts/:id/emails')
  async getContactEmails(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('bodies') bodies?: string,
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    const parsedLimit = limit ? parseInt(limit, 10) : 50
    const parsedOffset = offset ? parseInt(offset, 10) : 0
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0 || parsedLimit > 200) {
      throw new BadRequestException('limit must be between 1 and 200')
    }
    if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
      throw new BadRequestException('offset must be 0 or greater')
    }
    return this.leadsService.getContactEmails(supabase, id, scope.orgId, {
      limit: parsedLimit,
      offset: parsedOffset,
      includeBodies: bodies !== 'summary',
    })
  }

  @Get('contacts/:id/emails/:emailId')
  async getContactEmail(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Param('emailId') emailId: string,
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    if (!UUID_RE.test(emailId)) throw new BadRequestException('Invalid email id')
    return this.leadsService.getContactEmail(supabase, id, emailId, scope.orgId)
  }

  @Get('contacts/:id/conversations')
  async getContactConversations(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    const parsedLimit = limit ? parseInt(limit, 10) : 50
    const parsedOffset = offset ? parseInt(offset, 10) : 0
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0 || parsedLimit > 200) {
      throw new BadRequestException('limit must be between 1 and 200')
    }
    if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
      throw new BadRequestException('offset must be 0 or greater')
    }
    return this.leadsService.getContactConversations(supabase, id, scope.orgId, {
      limit: parsedLimit,
      offset: parsedOffset,
    })
  }
}

import { Controller, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { DomainAuthService } from '../services/domain-auth.service'

@Controller('email/domains')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class DomainReplyTrackingController {
  constructor(private readonly domainAuthService: DomainAuthService) {}

  @Post(':id/reply-tracking/enable')
  async enableReplyTracking(
    @Supabase() supabase: SupabaseClient,
    @Param('id') domainId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const result = await this.domainAuthService.enableReplyTracking(
        supabase,
        domainId,
        scope.orgId,
      )
      return {
        success: true,
        domain: result.domain,
        mxRecord: result.mxRecord,
        message: 'Reply tracking enabled. Add the MX record to receive replies.',
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to enable reply tracking',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post(':id/reply-tracking/disable')
  async disableReplyTracking(
    @Supabase() supabase: SupabaseClient,
    @Param('id') domainId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const domain = await this.domainAuthService.disableReplyTracking(
        supabase,
        domainId,
        scope.orgId,
      )
      return { success: true, domain, message: 'Reply tracking disabled.' }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to disable reply tracking',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post(':id/reply-tracking/verify-mx')
  async verifyReplyTrackingMx(
    @Supabase() supabase: SupabaseClient,
    @Param('id') domainId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const result = await this.domainAuthService.verifyReplyTrackingMx(
        supabase,
        domainId,
        scope.orgId,
      )
      return {
        success: true,
        valid: result.valid,
        mxRecords: result.mxRecords,
        error: result.error,
        message: result.valid
          ? 'MX record verified! Reply tracking is fully configured.'
          : result.error || 'MX record not found.',
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to verify MX record',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}

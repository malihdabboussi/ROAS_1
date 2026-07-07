import {
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
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
import { SenderIdentityService } from '../services/sender-identity.service'

@Controller('email/sender-identities')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class SenderIdentitySyncController {
  private readonly logger = new Logger(SenderIdentitySyncController.name)

  constructor(private readonly senderService: SenderIdentityService) {}

  @Post(':id/sync-status')
  async syncVerificationStatus(
    @Supabase() supabase: SupabaseClient,
    @Param('id') identityId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const identity = await this.senderService.syncVerificationStatus(
        supabase,
        identityId,
        scope.orgId,
      )
      return { success: true, senderIdentity: identity }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        { success: false, error: 'Failed to sync verification status' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post('sync')
  async syncFromSendGrid(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const result = await this.senderService.syncFromSendGrid(supabase, user.id, scope.orgId)
      return { success: true, synced: result.synced }
    } catch (error) {
      this.logger.error(`Failed to sync from SendGrid: ${error}`)
      throw new HttpException(
        { success: false, error: 'Failed to sync from SendGrid' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}

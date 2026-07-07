import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
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
import { CreateSenderIdentitySchema, UpdateSenderIdentitySchema } from '../dto/sender-identity.dto'
import { SenderIdentityService } from '../services/sender-identity.service'

@Controller('email/sender-identities')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class SenderIdentitiesController {
  private readonly logger = new Logger(SenderIdentitiesController.name)

  constructor(private readonly senderService: SenderIdentityService) {}

  @Get()
  async listSenderIdentities(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const identities = await this.senderService.listSenderIdentities(
        supabase,
        user.id,
        scope.orgId,
      )
      return { success: true, senderIdentities: identities }
    } catch (error) {
      this.logger.error(`Failed to list sender identities: ${error}`)
      throw new HttpException(
        { success: false, error: 'Failed to list sender identities' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post()
  async createSenderIdentity(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const validation = CreateSenderIdentitySchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    try {
      const result = await this.senderService.createSenderIdentity(
        supabase,
        user.id,
        validation.data,
        scope.orgId,
      )
      if (!result.success) {
        throw new HttpException({ success: false, error: result.error }, HttpStatus.BAD_REQUEST)
      }
      return { success: true, senderIdentity: result.senderIdentity }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create sender identity',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Get(':id')
  async getSenderIdentity(
    @Supabase() supabase: SupabaseClient,
    @Param('id') identityId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const identity = await this.senderService.getSenderIdentity(supabase, identityId, scope.orgId)
      return { success: true, senderIdentity: identity }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        { success: false, error: 'Sender identity not found' },
        HttpStatus.NOT_FOUND,
      )
    }
  }

  @Patch(':id')
  async updateSenderIdentity(
    @Supabase() supabase: SupabaseClient,
    @Param('id') identityId: string,
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const validation = UpdateSenderIdentitySchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    try {
      const result = await this.senderService.updateSenderIdentity(
        supabase,
        identityId,
        validation.data,
        scope.orgId,
      )
      return { success: true, senderIdentity: result.senderIdentity }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        { success: false, error: 'Failed to update sender identity' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Delete(':id')
  async deleteSenderIdentity(
    @Supabase() supabase: SupabaseClient,
    @Param('id') identityId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      await this.senderService.deleteSenderIdentity(supabase, identityId, scope.orgId)
      return { success: true, message: 'Sender identity deleted' }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        { success: false, error: 'Failed to delete sender identity' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post(':id/default')
  async setDefaultSenderIdentity(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') identityId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      await this.senderService.setDefaultSenderIdentity(supabase, user.id, identityId, scope.orgId)
      return { success: true, message: 'Default sender identity updated' }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        { success: false, error: 'Failed to set default sender identity' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}

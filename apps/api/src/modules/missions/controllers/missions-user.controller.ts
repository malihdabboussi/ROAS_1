import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
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
import { MissionsUserOperationsService } from '../services/missions-user-operations.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsUserController {
  constructor(private readonly missionsUserOperationsService: MissionsUserOperationsService) {}

  @Patch('profile/settings')
  async updateProfileSettings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body()
    body: {
      daily_digest_enabled?: boolean
      daily_digest_time?: string
      preferred_channel?: string
      auto_approve_plans?: boolean
      public_agent_slug?: string
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.updateProfileSettings(user, supabase, body)
  }

  @Get('profile/settings')
  async getProfileSettings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.getProfileSettings(user, supabase)
  }

  @Patch('awareness-toggle')
  async toggleAwareness(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { enabled: boolean },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.toggleAwareness(user, supabase, body)
  }

  @Patch('auto-approve-toggle')
  async toggleAutoApprovePlans(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { enabled: boolean },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.toggleAutoApprovePlans(user, supabase, body)
  }

  @Get('notifications')
  async listNotifications(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query() query: { limit?: string; unread_only?: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.listNotifications(user, supabase, query, scope)
  }

  @Get('notifications/unread-count')
  async getUnreadCount(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.getUnreadCount(user, supabase, scope)
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  async markNotificationsReadAll(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.markNotificationsReadAll(user, supabase, scope)
  }

  @Delete('notifications/read')
  async deleteReadNotifications(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.deleteReadNotifications(user, supabase, scope)
  }

  @Patch('notifications/:notificationId/read')
  async markNotificationRead(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('notificationId') notificationId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.markNotificationRead(
      user,
      supabase,
      notificationId,
      scope,
    )
  }

  @Delete('notifications/:notificationId')
  async deleteNotification(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('notificationId') notificationId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.deleteNotification(
      user,
      supabase,
      notificationId,
      scope,
    )
  }
}

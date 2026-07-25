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
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  ClearNotificationsBodySchema,
  ListNotificationsQuerySchema,
  NotificationBucketBodySchema,
  NotificationIdParamSchema,
  NotificationSnoozeBodySchema,
  type ClearNotificationsBody,
  type ListNotificationsQuery,
  type NotificationBucketBody,
  type NotificationIdParam,
  type NotificationSnoozeBody,
} from '../dto/notifications-inbox.dto'
import { NotificationsInboxService } from '../services/notifications-inbox.service'

@Controller('missions/notifications')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsNotificationsController {
  constructor(private readonly service: NotificationsInboxService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query(new ZodValidationPipe(ListNotificationsQuerySchema)) query: ListNotificationsQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.list(user, supabase, query, scope)
  }

  @Get('counts')
  counts(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.counts(user, supabase, scope)
  }

  @Get('unread-count')
  async unreadCount(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    const counts = await this.service.counts(user, supabase, scope)
    return { count: counts.primary + counts.other + counts.later + counts.cleared }
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.markAllRead(user, supabase, scope)
  }

  @Post('clear-all')
  @HttpCode(HttpStatus.OK)
  clearAll(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body(new ZodValidationPipe(ClearNotificationsBodySchema)) body: ClearNotificationsBody,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.clearAll(user, supabase, body, scope)
  }

  @Delete('read')
  deleteRead(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.deleteRead(user, supabase, scope)
  }

  @Post(':notificationId/bucket')
  moveBucket(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(NotificationIdParamSchema)) params: NotificationIdParam,
    @Body(new ZodValidationPipe(NotificationBucketBodySchema)) body: NotificationBucketBody,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.moveBucket(user, supabase, params.notificationId, body, scope)
  }

  @Post(':notificationId/snooze')
  snooze(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(NotificationIdParamSchema)) params: NotificationIdParam,
    @Body(new ZodValidationPipe(NotificationSnoozeBodySchema)) body: NotificationSnoozeBody,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.snooze(user, supabase, params.notificationId, body, scope)
  }

  @Post(':notificationId/unsnooze')
  unsnooze(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(NotificationIdParamSchema)) params: NotificationIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.patchState(user, supabase, params.notificationId, scope, {
      snoozed_until: null,
    })
  }

  @Post(':notificationId/clear')
  clear(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(NotificationIdParamSchema)) params: NotificationIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.patchState(user, supabase, params.notificationId, scope, {
      cleared_at: new Date().toISOString(),
    })
  }

  @Post(':notificationId/unclear')
  unclear(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(NotificationIdParamSchema)) params: NotificationIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.patchState(user, supabase, params.notificationId, scope, {
      cleared_at: null,
    })
  }

  @Patch(':notificationId/read')
  markRead(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(NotificationIdParamSchema)) params: NotificationIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.markRead(user, supabase, params.notificationId, scope)
  }

  @Post(':notificationId/unread')
  markUnread(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(NotificationIdParamSchema)) params: NotificationIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.patchState(user, supabase, params.notificationId, scope, {
      read_at: null,
    })
  }

  @Delete(':notificationId')
  remove(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(NotificationIdParamSchema)) params: NotificationIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.remove(user, supabase, params.notificationId, scope)
  }
}

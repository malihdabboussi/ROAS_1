import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
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
import { TaskRollupQuerySchema, type TaskRollupQuery } from '../dto/task-rollup.dto'
import { TaskRollupService } from '../services/task-rollup.service'

@Controller('tasks')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class TaskRollupController {
  constructor(private readonly taskRollupService: TaskRollupService) {}

  @Get('rollup')
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(TaskRollupQuerySchema)) query: TaskRollupQuery,
  ) {
    return this.taskRollupService.list(supabase, user.id, query, scope.orgId, scope.orgRole)
  }
}

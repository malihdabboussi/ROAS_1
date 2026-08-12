import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { MeetingMergeService } from '../services/meeting-merge.service'

const ParamsSchema = z.object({ spaceId: z.string().uuid() })

export const MergeMeetingsSchema = z
  .object({
    survivor_item_id: z.string().uuid(),
    duplicate_item_ids: z.array(z.string().uuid()).min(1).max(9),
  })
  .refine((body) => !body.duplicate_item_ids.includes(body.survivor_item_id), {
    message: 'survivor_item_id cannot appear in duplicate_item_ids',
  })

@Controller('spaces/:spaceId/meetings')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MeetingMergeController {
  constructor(private readonly merge: MeetingMergeService) {}

  @Post('merge')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequireOrgRole('editor')
  mergeMeetings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ParamsSchema)) params: z.infer<typeof ParamsSchema>,
    @Body(new ZodValidationPipe(MergeMeetingsSchema))
    body: z.infer<typeof MergeMeetingsSchema>,
  ) {
    return this.merge.mergeMeetings(supabase, {
      spaceId: params.spaceId,
      userId: user.id,
      orgId: scope.orgId,
      survivorItemId: body.survivor_item_id,
      duplicateItemIds: body.duplicate_item_ids,
    })
  }
}

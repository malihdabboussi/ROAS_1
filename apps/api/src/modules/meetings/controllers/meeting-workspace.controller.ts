import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
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
import { MeetingWorkspaceService } from '../services/meeting-workspace.service'

const MeetingParamsSchema = z.object({
  spaceId: z.string().uuid(),
  meetingItemId: z.string().uuid(),
})
const MeetingActionParamsSchema = MeetingParamsSchema.extend({
  actionId: z.string().uuid(),
})
const PhaseBodySchema = z.object({
  phase: z.enum(['scheduled', 'live', 'processing', 'complete']),
})
const SnippetBodySchema = z.object({
  source_type: z.enum(['pasted_text', 'call_quote', 'partial_transcript', 'observation', 'clip']),
  text: z.string().trim().min(1).max(50_000),
  source_recording_id: z.string().uuid().nullable().optional(),
  occurred_at: z.string().datetime().nullable().optional(),
  source_label: z.string().trim().max(500).nullable().optional(),
})
const ActionPatchSchema = z
  .object({
    status: z
      .enum(['proposed', 'confirmed', 'in_progress', 'resolved', 'rolled_forward', 'dismissed'])
      .optional(),
    due_at: z.string().datetime().nullable().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable().optional(),
    resolution: z.record(z.unknown()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0)

@Controller('spaces/:spaceId/meetings/:meetingItemId')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MeetingWorkspaceController {
  constructor(private readonly meetings: MeetingWorkspaceService) {}

  @Get()
  @RequireOrgRole('viewer')
  getWorkspace(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MeetingParamsSchema))
    params: z.infer<typeof MeetingParamsSchema>,
  ) {
    return this.meetings.getWorkspace(supabase, params)
  }

  @Post('start')
  @RequireOrgRole('editor')
  startCall(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(MeetingParamsSchema))
    params: z.infer<typeof MeetingParamsSchema>,
  ) {
    return this.meetings.startCall(supabase, {
      ...params,
      userId: user.id,
      orgId: scope.orgId,
    })
  }

  @Patch('phase')
  @RequireOrgRole('editor')
  setPhase(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MeetingParamsSchema))
    params: z.infer<typeof MeetingParamsSchema>,
    @Body(new ZodValidationPipe(PhaseBodySchema)) body: z.infer<typeof PhaseBodySchema>,
  ) {
    return this.meetings.setPhase(supabase, params.meetingItemId, body.phase)
  }

  @Post('snippets')
  @RequireOrgRole('editor')
  addSnippet(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(MeetingParamsSchema))
    params: z.infer<typeof MeetingParamsSchema>,
    @Body(new ZodValidationPipe(SnippetBodySchema)) body: z.infer<typeof SnippetBodySchema>,
  ) {
    return this.meetings.addSnippet(supabase, {
      ...params,
      userId: user.id,
      orgId: scope.orgId,
      sourceType: body.source_type,
      text: body.text,
      sourceRecordingId: body.source_recording_id,
      occurredAt: body.occurred_at,
      sourceLabel: body.source_label,
    })
  }

  @Patch('actions/:actionId')
  @RequireOrgRole('editor')
  updateAction(
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MeetingActionParamsSchema))
    params: z.infer<typeof MeetingActionParamsSchema>,
    @Body(new ZodValidationPipe(ActionPatchSchema)) body: z.infer<typeof ActionPatchSchema>,
  ) {
    return this.meetings.updateAction(supabase, {
      ...params,
      patch: body,
    })
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { EmotionalIntelligenceService } from '../services/emotional-intelligence.service'

/**
 * Emotional Intelligence Controller (Dispenza Layers 3-5)
 *
 * Layer 3: Observe emotional responses to memories
 * Layer 4: Detect belief patterns from emotional data
 * Layer 5: Synthesize perspectives from belief clusters
 */
@Controller('brain')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class EmotionalController {
  constructor(private readonly emotionalIntelligence: EmotionalIntelligenceService) {}

  // ── Layer 3: Emotional Observation ─────────────────────────────────────

  @Post('observe')
  @HttpCode(HttpStatus.CREATED)
  async observe(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      memory_id: string
      emotion: string
      valence?: number
      intensity?: number
      context?: string
      session_key?: string
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.emotionalIntelligence.recordObservation(supabase, {
      memory_id: body.memory_id,
      observer_id: 'vibey',
      subject_id: user.id,
      emotion: body.emotion,
      valence: body.valence,
      intensity: body.intensity,
      context: body.context,
      session_key: body.session_key,
    })
  }

  // ── Layer 3: Emotional Profile ─────────────────────────────────────────

  @Get('emotional-profile')
  async getEmotionalProfile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.emotionalIntelligence.getEmotionalProfile(supabase, user.id)
  }

  // ── Layer 4: Pattern Detection ─────────────────────────────────────────

  @Post('patterns/detect')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  async detectPatterns(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { days?: number },
    @OrgContext() scope: RequestScope,
  ) {
    return this.emotionalIntelligence.detectPatterns(supabase, user.id, body.days ?? 7, scope.orgId)
  }

  @Get('patterns')
  async getPatterns(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() _scope: RequestScope,
    @Query('brainId') brainId?: string,
  ) {
    if (brainId) {
      return this.emotionalIntelligence.getPatternsForBrain(supabase, brainId)
    }
    return this.emotionalIntelligence.getPatterns(supabase, user.id)
  }

  // ── Layer 5: Perspectives ──────────────────────────────────────────────

  @Get('perspectives')
  async getPerspectives(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() _scope: RequestScope,
    @Query('brainId') brainId?: string,
  ) {
    if (brainId) {
      return this.emotionalIntelligence.getPerspectivesForBrain(supabase, brainId)
    }
    return this.emotionalIntelligence.getPerspectives(supabase, user.id)
  }

  // ── Layer 6: Emergent Customer Avatars ─────────────────────────────────
  @Get('avatars')
  async getCustomerAvatars(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() _user: { id: string },
    @OrgContext() _scope: RequestScope,
    @Query('brainId') brainId: string,
  ) {
    if (!brainId) return []
    return this.emotionalIntelligence.getCustomerAvatarsForBrain(supabase, brainId)
  }
}

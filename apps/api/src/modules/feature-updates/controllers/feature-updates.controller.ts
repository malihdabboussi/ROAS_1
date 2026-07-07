import { BadRequestException, Controller, Get, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import { FeatureUpdatesService } from '../services/feature-updates.service'

@Controller('feature-updates')
@UseGuards(AuthGuard, ThrottlerGuard)
export class FeatureUpdatesController {
  constructor(private readonly featureUpdatesService: FeatureUpdatesService) {}

  @Get()
  async listFeatureUpdates(
    @CurrentUser() _user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const updates = await this.featureUpdatesService.listActiveFeatureUpdates(supabase)
      return { updates }
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to load updates',
      )
    }
  }
}

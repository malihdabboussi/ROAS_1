import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'

@Controller('artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post('delete')
  @UseGuards(AuthGuard)
  async executeDelete(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { delete_action?: string; entity_id?: string; agent_message_id?: string },
  ) {
    return this.artifactsService.executeDelete(supabase, user.id, body)
  }
}

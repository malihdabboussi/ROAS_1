import { Body, Controller, Get, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common'
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
import { MeetingsSpaceBootstrapService } from '../../../meetings/intake/services/meetings-space-bootstrap.service'
import { ConnectReadAiSchema } from '../dto/read-ai.dto'
import { ReadAiApiService } from '../services/read-ai-api.service'

@Controller('integrations/read-ai')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class ReadAiController {
  constructor(
    private readonly api: ReadAiApiService,
    private readonly meetingsSpace: MeetingsSpaceBootstrapService,
  ) {}

  @Get('status')
  async status(@CurrentUser() user: { id: string }) {
    const result = await this.api.getStatus(user.id)
    return { success: true, ...result }
  }

  @Post('connect')
  async connect(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
    @Body() body: unknown,
  ) {
    const validation = ConnectReadAiSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.connect(user.id, validation.data.signingKey)
    // Meetings from Read AI land in the same Meetings space Fathom uses.
    await this.meetingsSpace.ensureMeetingsSpaceQuietly(supabase, scope)
    return { success: true, ...result }
  }

  @Post('disconnect')
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.api.disconnect(user.id)
    return { success: true }
  }
}

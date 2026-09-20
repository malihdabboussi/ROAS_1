import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
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
import { CreditsGuard } from '../../../billing/guards/credits.guard'
import { MeetingProviderRegistry } from '../../providers/meeting-provider.registry'
import { ImportMeetingSchema, MeetingProviderParamSchema } from '../dto/meeting-import.dto'
import { MeetingIntakeRepository } from '../repositories/meeting-intake.repository'
import { MeetingImportService } from '../services/meeting-import.service'

@Controller('integrations/meetings')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class MeetingImportsController {
  constructor(
    private readonly registry: MeetingProviderRegistry,
    private readonly repository: MeetingIntakeRepository,
    private readonly meetingImport: MeetingImportService,
  ) {}

  /** Every registered note taker, what it can do, and whether the caller has it connected. */
  @Get('providers')
  async listProviders(@CurrentUser() user: { id: string }) {
    const capabilitiesList = await this.registry.listCapabilities()
    const providers = await Promise.all(
      capabilitiesList.map(async (capabilities) => ({
        ...capabilities,
        connected: Boolean(await this.repository.findConnectionForUser(capabilities.id, user.id)),
      })),
    )
    return { success: true, providers }
  }

  /** Import one meeting from any connected provider into a brain. */
  @Post(':provider/import')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async importMeeting(
    @Param('provider') providerParam: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
    @Body() body: unknown,
  ) {
    const provider = MeetingProviderParamSchema.safeParse(providerParam)
    if (!provider.success) {
      throw new HttpException({ success: false, error: 'Unknown provider' }, HttpStatus.NOT_FOUND)
    }
    const validation = ImportMeetingSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.meetingImport.importToBrain({
      ...validation.data,
      provider: provider.data,
      userId: user.id,
      scope,
      supabase,
    })
  }
}

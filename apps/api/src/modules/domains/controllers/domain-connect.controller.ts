import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import { ConnectDomainDto } from '../dto/connect-domain.dto'
import { ConnectFunnelDto } from '../dto/connect-funnel.dto'
import { ConnectPresentationDto } from '../dto/connect-presentation.dto'
import { ConnectProjectDto } from '../dto/connect-project.dto'
import { DisconnectFunnelDto } from '../dto/disconnect-funnel.dto'
import { DisconnectPresentationDto } from '../dto/disconnect-presentation.dto'
import { DisconnectProjectDto } from '../dto/disconnect-project.dto'
import { DomainConnectionService } from '../services/domain-connection.service'

@Controller('domains')
@UseGuards(AuthGuard, ThrottlerGuard)
export class DomainConnectController {
  constructor(private readonly domainConnectionService: DomainConnectionService) {}

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connectToLandingPage(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: ConnectDomainDto,
  ) {
    return this.domainConnectionService.connectToLandingPage(supabase, user.id, dto)
  }

  @Post('connect-funnel')
  @HttpCode(HttpStatus.OK)
  async connectToFunnel(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: ConnectFunnelDto,
  ) {
    return this.domainConnectionService.connectToFunnel(supabase, user.id, dto)
  }

  @Post('disconnect-funnel')
  @HttpCode(HttpStatus.OK)
  async disconnectFromFunnel(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: DisconnectFunnelDto,
  ) {
    return this.domainConnectionService.disconnectFromFunnel(supabase, user.id, dto)
  }

  @Post('connect-presentation')
  @HttpCode(HttpStatus.OK)
  async connectToPresentation(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: ConnectPresentationDto,
  ) {
    return this.domainConnectionService.connectToPresentation(supabase, user.id, dto)
  }

  @Post('disconnect-presentation')
  @HttpCode(HttpStatus.OK)
  async disconnectFromPresentation(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: DisconnectPresentationDto,
  ) {
    return this.domainConnectionService.disconnectFromPresentation(supabase, user.id, dto)
  }

  @Post('connect-project')
  @HttpCode(HttpStatus.OK)
  async connectToProject(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: ConnectProjectDto,
  ) {
    return this.domainConnectionService.connectToProject(supabase, user.id, dto)
  }

  @Post('disconnect-project')
  @HttpCode(HttpStatus.OK)
  async disconnectFromProject(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: DisconnectProjectDto,
  ) {
    return this.domainConnectionService.disconnectFromProject(supabase, user.id, dto)
  }
}

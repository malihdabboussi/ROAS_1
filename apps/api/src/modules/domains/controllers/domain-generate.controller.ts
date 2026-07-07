import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import { GenerateSubdomainDto } from '../dto/generate-subdomain.dto'
import { DomainOrchestrationService } from '../services/domain-orchestration.service'

@Controller('domains')
@UseGuards(AuthGuard, ThrottlerGuard)
export class DomainGenerateController {
  constructor(private readonly domainOrchestrationService: DomainOrchestrationService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateSubdomain(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: GenerateSubdomainDto,
  ) {
    return this.domainOrchestrationService.generateSubdomain(supabase, user.id, dto)
  }
}
